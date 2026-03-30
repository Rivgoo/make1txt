import type { 
  FileNode, GeneratorStats, Profile, GlobalSettings, LocalFilters 
} from '@/core/types/file.types';

export interface FolderStat {
  total: number;
  selected: number;
  absoluteTotal: number;
  sizeBytes: number;
  selectedSizeBytes: number;
  exactTokens?: number;
}

export interface DirectorySlice {
  nodes: FileNode[];
  isLoading: boolean;
  scannedFilesCount: number;
  rootHandle: FileSystemDirectoryHandle | null;
  abortController: AbortController | null;
  isRestoredFromProfile: boolean;
  activeTab: 'tree' | 'result';
  generatedText: string | null;
  previewNode: FileNode | null;
  gitignoreRegexes: RegExp[];
  compiledCustomRegexes: RegExp[];

  setActiveTab: (tab: 'tree' | 'result') => void;
  setGeneratedText: (text: string | null) => void;
  setPreviewNode: (node: FileNode | null) => void;
  loadDirectory: () => Promise<void>;
  loadDirectoryFromHandle: (handle: FileSystemDirectoryHandle, applyProfile?: Profile, isRestored?: boolean) => Promise<void>;
  cancelDirectoryLoad: () => void;
}

export interface SettingsSlice {
  globalSettings: GlobalSettings;
  updateGlobalSettings: (newSettings: Partial<GlobalSettings>) => void;
  resetGlobalSettings: () => void;
}

export interface FiltersSlice {
  localFilters: LocalFilters;
  updateLocalFilters: (newFilters: Partial<LocalFilters>) => void;
  toggleExtension: (ext: string) => void;
  setAllExtensionsState: (isActive: boolean) => void;
  addCustomPattern: (pattern: string) => void;
  updateCustomPattern: (id: string, newPattern: string) => void;
  toggleCustomPattern: (id: string) => void;
  removeCustomPattern: (id: string) => void;
  moveCustomPattern: (id: string, direction: 'up' | 'down') => void;
  toggleLocalPathIgnore: (path: string) => void;
}

export interface SelectionSlice {
  toggleSelection: (id: string, checked: boolean) => void;
  toggleExpand: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getStats: () => GeneratorStats;
}

export interface TokenizationSlice {
  realTokenMap: Record<string, number>;
  isTokenizing: boolean;
  tokenizationProgress: number;
  needsManualTokenization: boolean;
  tokenizerWorker: Worker | null;

  evaluateTokenization: () => void;
  runTokenization: (force: boolean) => void;
  cancelTokenization: () => void;
}

export interface ProfilesSlice {
  profiles: Profile[];
  fetchProfiles: () => Promise<void>;
  saveCurrentProfile: (name: string, saveDirectory: boolean) => Promise<void>;
  loadProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

export interface FileStore extends 
  DirectorySlice, SettingsSlice, FiltersSlice, 
  SelectionSlice, TokenizationSlice, ProfilesSlice {}