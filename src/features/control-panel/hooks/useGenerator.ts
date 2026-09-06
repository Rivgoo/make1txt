import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import type { WorkerInput, WorkerOutput } from '@/core/types/worker.types';
import { generateTextTree } from '@/core/utils/tree.utils';
import { optimizeText } from '@/core/utils/optimization.utils';
import { csharpAnalyzer, type FileMetaData } from '@/core/services/CSharpAnalyzer';

const MAX_PARSE_SIZE = 500 * 1024;

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
    (fileContentText: string, metaMap?: Record<string, string>): string => {
      if (!localFilters?.generateTree) return fileContentText;

      const rawTree = generateTextTree(nodes, {
        includeIgnored: localFilters.treeIncludeIgnored,
        symbols: globalSettings.treeSymbols,
        showEmptyFolders: localFilters.showEmptyFolders,
        metaMap
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

    const enableCSharpAnalysis = localFilters?.enableCSharpAnalysis ?? true;

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
          const finalText = assembleFinalText(fileContentText, data.metaMap);
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
        isOptimizationEnabled: localFilters?.isOptimizationEnabled ?? false,
        optimizationRules: localFilters?.optimizationRules ?? [],
        enableCSharpAnalysis
      };
      workerRef.current.postMessage(payload);

    } else {
      // Fallback Main Thread Implementation
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      try {
        if (enableCSharpAnalysis) {
          const hasCSharp = selectedFiles.some(f => f.path.toLowerCase().endsWith('.cs'));
          if (hasCSharp) {
            try {
              await csharpAnalyzer.init();
            } catch (err) {
              console.warn('[Fallback] Failed to init CSharpAnalyzer. Gracefully falling back.', err);
            }
          }
        }

        const totalSteps = selectedFiles.length * 2;
        let processed = 0;
        const BATCH_SIZE = 15;
        
        const fileTextCache = new Map<string, string>();
        const fileMetaCache = new Map<string, FileMetaData>();
        const globalClassRegistry = new Set<string>();

        // PASS 1
        for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const batch = selectedFiles.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (item) => {
              try {
                const file = await item.handle.getFile();
                if (maxFileSizeBytes > 0 && file.size > maxFileSizeBytes) {
                  fileTextCache.set(item.path, `[Skipped — file exceeds size limit: ${item.path}]\n`);
                  return;
                }

                let text = await file.text();
                if (localFilters?.isOptimizationEnabled && localFilters.optimizationRules?.length > 0) {
                  text = optimizeText(text, localFilters.optimizationRules).optimizedText;
                }
                
                fileTextCache.set(item.path, text);

                if (enableCSharpAnalysis && item.path.toLowerCase().endsWith('.cs') && file.size <= MAX_PARSE_SIZE) {
                  const meta = csharpAnalyzer.parseFile(text);
                  if (meta) {
                    meta.classes.forEach(c => globalClassRegistry.add(c.name));
                    fileMetaCache.set(item.path, meta);
                  }
                }
              } catch (err) {
                console.warn(`[Fallback] Exception while reading file ${item.path}:`, err);
                fileTextCache.set(item.path, t('generator.fileError').replace('{{path}}', item.path) + '\n');
              }
            })
          );

          processed += batch.length;
          setProgress(Math.round((processed / totalSteps) * 100));
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        // PASS 2
        const chunks: string[] = [];
        const formattedMetaMap: Record<string, string> = {};

        for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const batch = selectedFiles.slice(i, i + BATCH_SIZE);

          batch.forEach((item) => {
            const text = fileTextCache.get(item.path);
            if (text !== undefined) {
              if (enableCSharpAnalysis && fileMetaCache.has(item.path)) {
                const metaStr = csharpAnalyzer.formatTreeMetaData(fileMetaCache.get(item.path)!, globalClassRegistry);
                if (metaStr) formattedMetaMap[item.path] = metaStr;
              }
              
              const finalBlock = globalSettings.outputTemplate
                .replace(/\{\{path\}\}/g, item.path)
                .replace(/\{\{content\}\}/g, text);
                
              chunks.push(finalBlock);
            }
          });

          processed += batch.length;
          setProgress(Math.round((processed / totalSteps) * 100));
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }

        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const fileContentText = chunks.join('');
        const finalText = assembleFinalText(fileContentText, formattedMetaMap);
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
    localFilters,
    isRestoredFromProfile,
    showToast,
    setGeneratedText,
    setActiveTab,
    assembleFinalText,
    t,
  ]);

  return { isGenerating, progress, startGeneration, cancelGeneration };
}