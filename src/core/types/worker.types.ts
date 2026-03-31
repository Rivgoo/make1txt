import type { OptimizationRule } from './optimization.types';

export interface WorkerInput {
  files: { handle: FileSystemFileHandle; path: string }[];
  template: string;
  maxFileSizeBytes: number;
  isOptimizationEnabled?: boolean;
  optimizationRules?: OptimizationRule[];
}

export type WorkerOutput =
  | { type: 'progress'; progress: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; error: string };

export interface TokenizerInput {
  files: { id: string; handle: FileSystemFileHandle }[];
  isOptimizationEnabled?: boolean;
  optimizationRules?: OptimizationRule[];
  skipTiktoken?: boolean;
}

export interface TokenizerResult {
  tokens: number;
  originalBytes: number;
  optimizedBytes: number;
  skippedTiktoken: boolean;
}

export type TokenizerOutput =
  | { type: 'progress'; progress: number }
  | { type: 'result'; results: Record<string, TokenizerResult> }
  | { type: 'error'; error: string };