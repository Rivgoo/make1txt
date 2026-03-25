// src/core/workers/generator.worker.ts
export interface WorkerInput {
  files: { handle: FileSystemFileHandle; path: string }[];
  template: string;
}

export type WorkerOutput = 
  | { type: 'progress'; progress: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; error: string };

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { files, template } = e.data;
  const chunks: Blob[] = [];
  let processed = 0;

  for (const item of files) {
    try {
      const file = await item.handle.getFile();
      const text = await file.text();
      
      const formattedBlock = template
        .replace(/{{path}}/g, item.path)
        .replace(/{{content}}/g, text);

      chunks.push(new Blob([formattedBlock], { type: 'text/plain;charset=utf-8' }));
    } catch (err) {
      console.warn(`Пропущено файл ${item.path}:`, err);
    }

    processed++;
    if (processed % 10 === 0 || processed === files.length) {
      const progress = Math.round((processed / files.length) * 100);
      self.postMessage({ type: 'progress', progress });
    }
  }

  try {
    const finalBlob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
    self.postMessage({ type: 'done', blob: finalBlob });
  } catch {
    self.postMessage({ type: 'error', error: 'Помилка при створенні фінального файлу.' });
  }
};