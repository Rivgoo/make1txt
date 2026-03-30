export interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
}

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
  isGloballyIgnored: boolean;
  isLocallyIgnored: boolean;
  isExpanded: boolean;
}

export interface GeneratorStats {
  totalFiles: number;
  selectedFiles: number;
  totalSizeBytes: number;
  totalWords: number;
  tokens: number;
  isExactTokens: boolean;
}

export interface TreeSymbols {
  branch: string;
  last: string;
  vertical: string;
  space: string;
  ignoredSuffix: string;
}

export interface GlobalSettings {
  language: 'auto' | 'en' | 'uk';
  maxFileSizeKb: number;
  ignoredExtensions: string[];
  ignoredPaths: string[];
  useGitignore: boolean;
  pruneIgnoredOnRead: boolean;
  outputTemplate: string;
  treePlacement: 'top' | 'bottom';
  treeWrapper: string;
  treeSymbols: TreeSymbols;
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
  showGloballyIgnored: boolean;
  showLocallyIgnored: boolean;
  showEmptyFolders: boolean;
  generateTree: boolean;
  treeIncludeIgnored: boolean;
}

export interface SavedLocalFilters {
  hiddenExtensions: string[];
  customPatterns: CustomPattern[];
  showGloballyIgnored: boolean;
  showLocallyIgnored: boolean;
  showEmptyFolders: boolean;
  generateTree: boolean;
  treeIncludeIgnored: boolean;
}

export interface Profile {
  id: string;
  name: string;
  lastUsed: number;
  directoryHandle?: FileSystemDirectoryHandle;
  directoryName?: string;
  settings: GlobalSettings;
  localFilters: SavedLocalFilters;
}