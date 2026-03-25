// src/features/control-panel/hooks/useGenerator.ts
import { useState, useRef, useCallback } from 'react';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import type { WorkerOutput, WorkerInput } from '@/core/workers/generator.worker';

export function useGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  
  const { nodes, globalSettings, setGeneratedText, setActiveTab } = useFileStore();
  const { showToast } = useToast();

  const cancelGeneration = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsGenerating(false);
    setProgress(0);
    showToast('warning', 'Скасовано', 'Процес генерації було перервано.');
  }, [showToast]);

  const startGeneration = useCallback(() => {
    const selectedFiles = nodes
      .filter(n => n.isSelected && !n.isIgnored && !n.isDirectory)
      .map(n => ({ handle: n.handle as FileSystemFileHandle, path: n.relativePath }));

    if (selectedFiles.length === 0) {
      showToast('warning', 'Порожньо', 'Немає файлів для генерації.');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    workerRef.current = new Worker(new URL('@/core/workers/generator.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = async (e: MessageEvent<WorkerOutput>) => {
      const data = e.data;
      
      if (data.type === 'progress') {
        setProgress(data.progress);
      } else if (data.type === 'done') {
        const text = await data.blob.text();
        setGeneratedText(text);
        setActiveTab('result');

        setIsGenerating(false);
        setProgress(100);
        showToast('success', 'Готово', 'Генерацію завершено.');
        workerRef.current?.terminate();
      } else if (data.type === 'error') {
        setIsGenerating(false);
        showToast('error', 'Помилка', data.error);
        workerRef.current?.terminate();
      }
    };

    const payload: WorkerInput = { files: selectedFiles, template: globalSettings.outputTemplate };
    workerRef.current.postMessage(payload);
  }, [nodes, globalSettings.outputTemplate, showToast, setGeneratedText, setActiveTab]);

  return { isGenerating, progress, startGeneration, cancelGeneration };
}