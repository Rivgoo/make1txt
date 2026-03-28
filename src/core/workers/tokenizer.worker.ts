import { getEncoding } from 'js-tiktoken';
import type { TokenizerInput, TokenizerOutput } from '../types/worker.types';

const PROGRESS_BATCH = 20;

self.onmessage = async (e: MessageEvent<TokenizerInput>) => {
  const { files } = e.data;
  
  if (!files || files.length === 0) {
    self.postMessage({ type: 'result', results: {} } as TokenizerOutput);
    return;
  }

  try {
    const enc = getEncoding('cl100k_base');
    const results: Record<string, number> = {};
    let processed = 0;

    for (const item of files) {
      try {
        const file = await item.handle.getFile();
        const text = await file.text();
        const tokens = enc.encode(text).length;
        results[item.id] = tokens;
      } catch (err) {
        results[item.id] = 0;
        console.warn(`[Tokenizer Worker] Failed to read/tokenize file ${item.id}`, err);
      }

      processed++;

      if (processed % PROGRESS_BATCH === 0 || processed === files.length) {
        const progress = Math.round((processed / files.length) * 100);
        self.postMessage({ type: 'progress', progress } as TokenizerOutput);
      }
    }

    self.postMessage({ type: 'result', results } as TokenizerOutput);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Tokenization failed',
    } as TokenizerOutput);
  }
};