import type { WorkerInput, WorkerOutput } from '../types/worker.types';
import { optimizeText } from '../utils/optimization.utils';
import { csharpAnalyzer, type FileMetaData } from '../services/CSharpAnalyzer';

const PROGRESS_BATCH = 10;
const MAX_PARSE_SIZE = 5 * 1024 * 1024; // 5 MB

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
        console.warn('[Worker] Failed to init CSharpAnalyzer. Gracefully falling back.', err);
      }
    }
  }

  const fileTextCache = new Map<string, Blob>();
  const fileMetaCache = new Map<string, FileMetaData>();
  const asmdefMetaCache = new Map<string, string>();
  const globalTypeRegistry = new Set<string>();

  let processed = 0;
  const totalSteps = files.length * 2; 

  // PASS 1: Read and Index
  for (const item of files) {
    try {
      const isCSharp = item.path.toLowerCase().endsWith('.cs');
      const isAsmdef = item.path.toLowerCase().endsWith('.asmdef');

      let text = '';
      let size = 0;

      if (item.content !== undefined) {
        text = item.content;
        size = new Blob([text]).size;
      } else if (item.handle) {
        const file = await item.handle.getFile();
        size = file.size;
        if (maxFileSizeBytes <= 0 || size <= maxFileSizeBytes) {
          text = await file.text();
        }
      }

      if (maxFileSizeBytes > 0 && size > maxFileSizeBytes) {
        const skipMsg = `[Skipped — file exceeds size limit: ${item.path}]\n`;
        fileTextCache.set(item.path, new Blob([skipMsg], { type: 'text/plain;charset=utf-8' }));
      } else {
        if (isOptimizationEnabled && optimizationRules && optimizationRules.length > 0) {
          text = optimizeText(text, optimizationRules).optimizedText;
        }

        fileTextCache.set(item.path, new Blob([text], { type: 'text/plain;charset=utf-8' }));

        if (enableCSharpAnalysis && isCSharp && size <= MAX_PARSE_SIZE) {
          const meta = csharpAnalyzer.parseFile(text);
          if (meta) {
            meta.classes.forEach(c => globalTypeRegistry.add(c.name));
            meta.interfaces.forEach(i => globalTypeRegistry.add(i.name));
            meta.structs.forEach(s => globalTypeRegistry.add(s.name));
            meta.records.forEach(r => globalTypeRegistry.add(r.name));
            meta.enums.forEach(e => globalTypeRegistry.add(e));
            meta.delegates.forEach(d => globalTypeRegistry.add(d));

            fileMetaCache.set(item.path, meta);
          }
        } else if (enableCSharpAnalysis && isAsmdef) {
          try {
            const cleanJson = text.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
            const parsed = JSON.parse(cleanJson);
            const modName = parsed.name || "Unknown";
            const rawRefs: string[] = parsed.references || [];
            
            const cleanRefs = rawRefs
              .filter(r => !r.startsWith('GUID:'))
              .map(r => r.split('/').pop() || r);

            let asmdefMeta = `Module: ${modName}`;
            if (cleanRefs.length > 0) asmdefMeta += ` ✦ Refs: ${cleanRefs.join(', ')}`;
            
            asmdefMetaCache.set(item.path, ` -> [ ${asmdefMeta} ]`);
          } catch {
            console.warn(`[Worker] Failed to parse asmdef: ${item.path}`);
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
        
        if (enableCSharpAnalysis) {
          if (fileMetaCache.has(item.path)) {
            const metaStr = csharpAnalyzer.formatTreeMetaData(fileMetaCache.get(item.path)!, globalTypeRegistry);
            if (metaStr) formattedMetaMap[item.path] = metaStr;
          } else if (asmdefMetaCache.has(item.path)) {
            formattedMetaMap[item.path] = asmdefMetaCache.get(item.path)!;
          }
        }
        
        const extMatch = item.path.match(/\.([^.]+)$/);
        const fileExt = extMatch ? extMatch[1].toLowerCase() : '';

        const finalBlock = template
          .replace(/\{\{path\}\}/g, item.path)
          .replace(/\{\{ext\}\}/g, fileExt)
          .replace(/\{\{content\}\}/g, text); 

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