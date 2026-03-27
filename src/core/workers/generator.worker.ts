import type { WorkerInput, WorkerOutput } from '../types/worker.types';

const PROGRESS_BATCH = 10;

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { files, template, maxFileSizeBytes } = e.data;

  if (files.length === 0) {
    self.postMessage({ type: 'done', blob: new Blob([], { type: 'text/plain;charset=utf-8' }) } as WorkerOutput);
    return;
  }

  const chunks: Blob[] = [];
  let processed = 0;

  for (const item of files) {
    try {
      const file = await item.handle.getFile();

      if (maxFileSizeBytes > 0 && file.size > maxFileSizeBytes) {
        const skipMsg = `[Skipped — file exceeds size limit: ${item.path}]\n`;
        chunks.push(new Blob([skipMsg], { type: 'text/plain;charset=utf-8' }));
      } else {
        const text = await file.text();
        const block = template
          .replace(/\{\{path\}\}/g, item.path)
          .replace(/\{\{content\}\}/g, text);
        chunks.push(new Blob([block], { type: 'text/plain;charset=utf-8' }));
      }
    } catch (err) {
      const errMsg = `[Error reading file: ${item.path}]\n`;
      chunks.push(new Blob([errMsg], { type: 'text/plain;charset=utf-8' }));
      console.warn(`Skipped ${item.path}:`, err);
    }

    processed++;

    if (processed % PROGRESS_BATCH === 0 || processed === files.length) {
      const progress = Math.round((processed / files.length) * 100);
      self.postMessage({ type: 'progress', progress } as WorkerOutput);
    }
  }

  try {
    const finalBlob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
    self.postMessage({ type: 'done', blob: finalBlob } as WorkerOutput);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Failed to assemble final file.',
    } as WorkerOutput);
  }
};