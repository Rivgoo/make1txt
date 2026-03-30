import type { StateCreator } from 'zustand';
import type { FileStore, TokenizationSlice } from '../store.types';
import type { TokenizerInput, TokenizerOutput } from '@/core/types/worker.types';
import { estimateTokenCount } from '@/core/utils/stats.utils';
import { MAX_AUTO_TOKENS } from '../constants';

export const createTokenizationSlice: StateCreator<FileStore, [], [], TokenizationSlice> = (set, get) => ({
  realTokenMap: {},
  isTokenizing: false,
  tokenizationProgress: 0,
  needsManualTokenization: false,
  tokenizerWorker: null,

  evaluateTokenization: () => {
    const { nodes, isTokenizing } = get();
    if (isTokenizing) return;

    let estimatedTokens = 0;
    for (const node of nodes) {
      if (!node.isDirectory && node.isSelected && !node.isIgnored) {
        estimatedTokens += estimateTokenCount(node.sizeBytes);
      }
    }

    if (estimatedTokens >= MAX_AUTO_TOKENS) {
      set({ needsManualTokenization: true });
    } else if (estimatedTokens > 0) {
      set({ needsManualTokenization: false });
      get().runTokenization(false);
    }
  },

  cancelTokenization: () => {
    const worker = get().tokenizerWorker;
    if (worker) {
      worker.terminate();
      set({ tokenizerWorker: null, isTokenizing: false, tokenizationProgress: 0 });
    }
  },

  runTokenization: () => {
    const { nodes, isTokenizing, realTokenMap } = get();
    if (isTokenizing) return;

    const filesToTokenize = nodes
      .filter(n => !n.isDirectory && n.isSelected && !n.isIgnored && realTokenMap[n.id] === undefined)
      .map(n => ({ id: n.id, handle: n.handle as FileSystemFileHandle }));

    if (filesToTokenize.length === 0) return;

    get().cancelTokenization();

    const worker = new Worker(new URL('@/core/workers/tokenizer.worker.ts', import.meta.url), { type: 'module' });
    
    set({ 
      isTokenizing: true, 
      tokenizationProgress: 0, 
      tokenizerWorker: worker,
      needsManualTokenization: false 
    });

    worker.onmessage = (e: MessageEvent<TokenizerOutput>) => {
      const data = e.data;
      if (data.type === 'progress') {
        set({ tokenizationProgress: data.progress });
      } else if (data.type === 'result') {
        set(state => ({
          realTokenMap: { ...state.realTokenMap, ...data.results },
          isTokenizing: false,
          tokenizationProgress: 100,
          tokenizerWorker: null
        }));
        worker.terminate();
      } else if (data.type === 'error') {
        console.error('[Tokenizer Worker Error]', data.error);
        set({ isTokenizing: false, tokenizerWorker: null });
        worker.terminate();
      }
    };

    worker.postMessage({ files: filesToTokenize } as TokenizerInput);
  }
});