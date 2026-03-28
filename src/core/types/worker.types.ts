export interface WorkerInput {
  files: { handle: FileSystemFileHandle; path: string }[];
  template: string;
  maxFileSizeBytes: number;
}

export type WorkerOutput =
  | { type: 'progress'; progress: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; error: string };

export interface TokenizerInput {
  files: { id: string; handle: FileSystemFileHandle }[];
}

export type TokenizerOutput =
  | { type: 'progress'; progress: number }
  | { type: 'result'; results: Record<string, number> }
  | { type: 'error'; error: string };