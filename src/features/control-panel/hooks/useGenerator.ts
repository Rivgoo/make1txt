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

  const {
    nodes,
    globalSettings,
    localFilters,
    isRestoredFromProfile,
    setGeneratedText,
    setActiveTab,
  } = useFileStore();
  const { showToast } = useToast();

  const cancelGeneration = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    setProgress(0);
    showToast('warning', t('common.warning'), t('generator.cancelled'));
  }, [showToast, t]);

  const assembleFinalText = useCallback(
    (fileContentText: string): string => {
      if (!localFilters.generateTree) return fileContentText;

      const rawTree = generateTextTree(nodes, {
        includeIgnored: localFilters.treeIncludeIgnored,
        symbols: globalSettings.treeSymbols,
        showEmptyFolders: localFilters.showEmptyFolders,
      });

      if (!rawTree) return fileContentText;

      const treeString = globalSettings.treeWrapper.replace('{{tree}}', rawTree);

      return globalSettings.treePlacement === 'top'
        ? treeString + fileContentText
        : fileContentText + treeString;
    },
    [localFilters, globalSettings, nodes],
  );

  const startGeneration = useCallback(async () => {
    const selectedFiles = nodes
      .filter((n) => n.isSelected && !n.isIgnored && !n.isDirectory)
      .map((n) => ({ handle: n.handle as FileSystemFileHandle, path: n.relativePath }));

    if (selectedFiles.length === 0) {
      showToast('warning', t('common.warning'), t('generator.empty'));
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    const maxFileSizeBytes =
      globalSettings.maxFileSizeKb > 0 ? globalSettings.maxFileSizeKb * 1024 : 0;

    if (!isRestoredFromProfile) {
      workerRef.current = new Worker(
        new URL('@/core/workers/generator.worker.ts', import.meta.url),
        { type: 'module' },
      );

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
          workerRef.current = null;
        } else if (data.type === 'error') {
          setIsGenerating(false);
          showToast('error', t('common.error'), data.error);
          workerRef.current?.terminate();
          workerRef.current = null;
        }
      };

      workerRef.current.onerror = (err) => {
        console.error('Worker error:', err);
        setIsGenerating(false);
        showToast('error', t('common.error'), t('generator.error'));
        workerRef.current?.terminate();
        workerRef.current = null;
      };

      const payload: WorkerInput = {
        files: selectedFiles,
        template: globalSettings.outputTemplate,
        maxFileSizeBytes,
      };
      workerRef.current.postMessage(payload);
    } else {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      try {
        const total = selectedFiles.length;
        let processed = 0;
        const BATCH_SIZE = 15;
        const chunks: string[] = [];

        for (let i = 0; i < total; i += BATCH_SIZE) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

          const batch = selectedFiles.slice(i, i + BATCH_SIZE);

          const results = await Promise.all(
            batch.map(async (item) => {
              try {
                const file = await item.handle.getFile();

                if (maxFileSizeBytes > 0 && file.size > maxFileSizeBytes) {
                  return `[Skipped — file exceeds size limit: ${item.path}]\n`;
                }

                const text = await file.text();
                return globalSettings.outputTemplate
                  .replace(/\{\{path\}\}/g, item.path)
                  .replace(/\{\{content\}\}/g, text);
              } catch {
                return t('generator.fileError').replace('{{path}}', item.path) + '\n';
              }
            }),
          );

          chunks.push(...results);
          processed += batch.length;
          setProgress(Math.round((processed / total) * 100));

          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const fileContentText = chunks.join('');
        const finalText = assembleFinalText(fileContentText);
        setGeneratedText(finalText);
        setActiveTab('result');
        setProgress(100);
        showToast('success', t('common.success'), t('generator.done'));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Generation error:', err);
        showToast('error', t('common.error'), t('generator.error'));
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    }
  }, [
    nodes,
    globalSettings,
    isRestoredFromProfile,
    showToast,
    setGeneratedText,
    setActiveTab,
    assembleFinalText,
    t,
  ]);

  return { isGenerating, progress, startGeneration, cancelGeneration };
}