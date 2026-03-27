export interface WorkerInput {
  files: { handle: FileSystemFileHandle; path: string }[];
  template: string;
  /** 0 = unlimited */
  maxFileSizeBytes: number;
}

export type WorkerOutput =
  | { type: 'progress'; progress: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; error: string };