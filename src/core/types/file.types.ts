// src/core/types/file.types.ts
export interface FileNode {
  id: string;
  name: string;
  relativePath: string;
  isDirectory: boolean;
  sizeBytes: number;
  handle: FileSystemHandle;
  depth: number;
  parentId: string | null;
  isSelected: boolean;
  isIgnored: boolean;
  isExpanded: boolean;
}

export interface GeneratorStats {
  totalFiles: number;
  selectedFiles: number;
  totalSizeBytes: number;
  totalWords: number;
  estimatedTokens: number;
}

export interface GlobalSettings {
  maxFileSizeKb: number;
  ignoredExtensions: string[];
  ignoredPaths: string[];
  useGitignoreDefault: boolean;
  outputTemplate: string;
}

export interface CustomPattern {
  id: string;
  pattern: string;
  isActive: boolean;
}

export interface ExtensionStat {
  count: number;
  isActive: boolean;
}

export interface LocalFilters {
  extensions: Record<string, ExtensionStat>;
  customPatterns: CustomPattern[];
  useGitignore: boolean;
  hasGitignore: boolean;
}

export interface Profile {
  id: string;
  name: string;
  directoryHandle?: FileSystemDirectoryHandle;
  settings: GlobalSettings;
}