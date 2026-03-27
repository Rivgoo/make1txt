import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import type { WorkerInput, WorkerOutput } from '@/core/types/worker.types';
import { generateTextTree } from '@/core/utils/tree.utils';

export function useGenerator() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { nodes, globalSettings, localFilters, rootHandle, isRestoredFromProfile, setGeneratedText, setActiveTab } = useFileStore();
  const { showToast } = useToast();

  const cancelGeneration = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setProgress(0);
    showToast('warning', t('common.warning'), t('generator.cancelled'));
  }, [showToast, t]);

  const assembleFinalText = useCallback((fileContentText: string) => {
    let treeString = '';
    
    if (localFilters.generateTree) {
      const rawTree = generateTextTree(nodes, {
        includeIgnored: localFilters.treeIncludeIgnored,
        symbols: globalSettings.treeSymbols,
        rootName: rootHandle?.name || 'project-root'
      });
      if (rawTree) {
        treeString = globalSettings.treeWrapper.replace('{{tree}}', rawTree);
      }
    }

    if (!treeString) return fileContentText;

    return globalSettings.treePlacement === 'top'
      ? treeString + fileContentText
      : fileContentText + treeString;
  }, [localFilters, globalSettings, nodes, rootHandle]);

  const startGeneration = useCallback(async () => {
    const selectedFiles = nodes
      .filter(n => n.isSelected && !n.isIgnored && !n.isDirectory)
      .map(n => ({ handle: n.handle as FileSystemFileHandle, path: n.relativePath }));

    if (selectedFiles.length === 0) {
      showToast('warning', t('common.warning'), t('generator.empty'));
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    if (!isRestoredFromProfile) {
      workerRef.current = new Worker(new URL('@/core/workers/generator.worker.ts', import.meta.url), {
        type: 'module',
      });

      workerRef.current.onmessage = async (e: MessageEvent<WorkerOutput>) => {
        const data = e.data;
        if (data.type === 'progress') {
          setProgress(data.progress);
        } else if (data.type === 'done') {
          const fileContentText = await data.blob.text();
          const finalText = assembleFinalText(fileContentText);
          
          setGeneratedText(finalText);
          setActiveTab('result');
          setIsGenerating(false);
          setProgress(100);
          showToast('success', t('common.success'), t('generator.done'));
          workerRef.current?.terminate();
        } else if (data.type === 'error') {
          setIsGenerating(false);
          showToast('error', t('common.error'), data.error);
          workerRef.current?.terminate();
        }
      };

      const payload: WorkerInput = { files: selectedFiles, template: globalSettings.outputTemplate };
      workerRef.current.postMessage(payload);

    } else {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      try {
        const chunks: string[] = [];
        const total = selectedFiles.length;
        let processed = 0;
        const BATCH_SIZE = 15;
        
        for (let i = 0; i < total; i += BATCH_SIZE) {
          if (signal.aborted) throw new Error('Aborted');
          
          const batch = selectedFiles.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async (item) => {
            try {
              const file = await item.handle.getFile();
              const text = await file.text();
              return globalSettings.outputTemplate
                .replace(/{{path}}/g, item.path)
                .replace(/{{content}}/g, text);
            } catch (err) {
              console.warn(`Skipped ${item.path}:`, err);
              return `\n${t('generator.fileError').replace('{{path}}', item.path)}\n`;
            }
          });

          const results = await Promise.all(batchPromises);
          chunks.push(...results);
          
          processed += batch.length;
          setProgress(Math.round((processed / total) * 100));
          
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (signal.aborted) throw new Error('Aborted');

        const finalBlob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
        const fileContentText = await finalBlob.text();
        const finalText = assembleFinalText(fileContentText);
        
        setGeneratedText(finalText);
        setActiveTab('result');
        setProgress(100);
        showToast('success', t('common.success'), t('generator.done'));
        
      } catch (error) {
        if (error instanceof Error && error.message === 'Aborted') return;
        showToast('error', t('common.error'), t('generator.error'));
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  }, [nodes, globalSettings.outputTemplate, isRestoredFromProfile, showToast, setGeneratedText, setActiveTab, assembleFinalText, t]);

  return { isGenerating, progress, startGeneration, cancelGeneration };
}