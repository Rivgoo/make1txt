import type { WorkerInput, WorkerOutput } from '../types/worker.types';
import { optimizeText } from '../utils/optimization.utils';
import { csharpAnalyzer, type FileMetaData } from '../services/CSharpAnalyzer';

const PROGRESS_BATCH = 10;
const MAX_PARSE_SIZE = 500 * 1024; // 500 KB limit for AST parsing

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { 
    files, 
    template, 
    maxFileSizeBytes, 
    isOptimizationEnabled, 
    optimizationRules, 
    enableCSharpAnalysis 
  } = e.data;

  if (files.length === 0) {
    self.postMessage({ type: 'done', blob: new Blob([], { type: 'text/plain;charset=utf-8' }) } as WorkerOutput);
    return;
  }

  if (enableCSharpAnalysis) {
    const hasCSharp = files.some(f => f.path.toLowerCase().endsWith('.cs'));
    if (hasCSharp) {
      try {
        await csharpAnalyzer.init();
      } catch (err) {
        console.warn('[Worker] Failed to init CSharpAnalyzer. Gracefully falling back to raw output.', err);
      }
    }
  }

  const fileTextCache = new Map<string, Blob>();
  const fileMetaCache = new Map<string, FileMetaData>();
  const globalClassRegistry = new Set<string>();

  let processed = 0;
  const totalSteps = files.length * 2; 

  // PASS 1: Read and Index
  for (const item of files) {
    try {
      const file = await item.handle.getFile();

      if (maxFileSizeBytes > 0 && file.size > maxFileSizeBytes) {
        const skipMsg = `[Skipped — file exceeds size limit: ${item.path}]\n`;
        fileTextCache.set(item.path, new Blob([skipMsg], { type: 'text/plain;charset=utf-8' }));
      } else {
        let text = await file.text();

        if (isOptimizationEnabled && optimizationRules && optimizationRules.length > 0) {
          text = optimizeText(text, optimizationRules).optimizedText;
        }

        fileTextCache.set(item.path, new Blob([text], { type: 'text/plain;charset=utf-8' }));

        if (enableCSharpAnalysis && item.path.toLowerCase().endsWith('.cs') && file.size <= MAX_PARSE_SIZE) {
          const meta = csharpAnalyzer.parseFile(text);
          if (meta) {
            meta.classes.forEach(c => globalClassRegistry.add(c.name));
            fileMetaCache.set(item.path, meta);
          }
        }
      }
    } catch (err) {
      console.warn(`[Worker] Exception while reading file ${item.path}:`, err);
      const errMsg = `[Error reading file: ${item.path}]\n`;
      fileTextCache.set(item.path, new Blob([errMsg], { type: 'text/plain;charset=utf-8' }));
    }

    processed++;
    if (processed % PROGRESS_BATCH === 0) {
      const progress = Math.round((processed / totalSteps) * 100);
      self.postMessage({ type: 'progress', progress } as WorkerOutput);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // PASS 2: Assemble Text and Build MetaMap
  const chunks: Blob[] = [];
  const formattedMetaMap: Record<string, string> = {};
  
  for (const item of files) {
    try {
      const cachedBlob = fileTextCache.get(item.path);
      if (cachedBlob) {
        const text = await cachedBlob.text();
        
        // Build map for the tree generator instead of injecting into text
        if (enableCSharpAnalysis && fileMetaCache.has(item.path)) {
          const metaStr = csharpAnalyzer.formatTreeMetaData(fileMetaCache.get(item.path)!, globalClassRegistry);
          if (metaStr) formattedMetaMap[item.path] = metaStr;
        }
        
        const finalBlock = template
          .replace(/\{\{path\}\}/g, item.path)
          .replace(/\{\{content\}\}/g, text); // No longer injecting meta block here

        chunks.push(new Blob([finalBlock], { type: 'text/plain;charset=utf-8' }));
      }
    } catch (err) {
       console.warn(`[Worker] Exception while assembling file ${item.path}:`, err);
    }

    processed++;
    if (processed % PROGRESS_BATCH === 0) {
      const progress = Math.round((processed / totalSteps) * 100);
      self.postMessage({ type: 'progress', progress } as WorkerOutput);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // FINALIZATION
  try {
    const finalBlob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
    self.postMessage({ type: 'progress', progress: 100 } as WorkerOutput);
    self.postMessage({ type: 'done', blob: finalBlob, metaMap: formattedMetaMap } as WorkerOutput);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Failed to assemble final file.',
    } as WorkerOutput);
  }
};