import { getEncoding } from 'js-tiktoken';
import type { TokenizerInput, TokenizerOutput, TokenizerResult } from '../types/worker.types';
import { optimizeText } from '../utils/optimization.utils';

const PROGRESS_BATCH = 20;

self.onmessage = async (e: MessageEvent<TokenizerInput>) => {
  const { files, isOptimizationEnabled, optimizationRules, skipTiktoken } = e.data;
  
  if (!files || files.length === 0) {
    self.postMessage({ type: 'result', results: {} } as TokenizerOutput);
    return;
  }

  try {
    const enc = skipTiktoken ? null : getEncoding('cl100k_base');
    const results: Record<string, TokenizerResult> = {};
    let processed = 0;

    for (const item of files) {
      try {
        const file = await item.handle.getFile();
        let text = await file.text();
        const originalBytes = file.size;
        let optimizedBytes = originalBytes;

        if (isOptimizationEnabled && optimizationRules && optimizationRules.length > 0) {
          const optResult = optimizeText(text, optimizationRules, false);
          text = optResult.optimizedText;
          optimizedBytes = optResult.optimizedBytes;
        }

        let tokens = 0;
        if (!skipTiktoken && enc) {
          tokens = enc.encode(text).length;
        }
        
        results[item.id] = {
          tokens,
          originalBytes,
          optimizedBytes,
          skippedTiktoken: !!skipTiktoken
        };
      } catch (err) {
        results[item.id] = { tokens: 0, originalBytes: 0, optimizedBytes: 0, skippedTiktoken: !!skipTiktoken };
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