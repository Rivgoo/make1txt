import { create } from 'zustand';
import type { FileNode, GeneratorStats, Profile, GlobalSettings, LocalFilters, ExtensionStat } from '@/core/types/file.types';
import { requestDirectoryAccess, readDirectoryRecursively, verifyDirectoryPermission } from '@/core/services/FileSystemService';
import { createIgnoreRegexes, isPathGloballyIgnored, compileGlobToRegex, DEFAULT_IGNORED_DIRECTORIES, DEFAULT_IGNORED_EXTENSIONS } from '@/core/services/IgnoreService';
import { estimateTokenCount, getFileExtension } from '@/core/utils/stats.utils';
import { dbService } from '@/core/services/DatabaseService';

export interface FolderStat {
  total: number;
  selected: number;
  absoluteTotal: number;
  sizeBytes: number;
  selectedSizeBytes: number;
}

export const DEFAULT_TREE_SYMBOLS = {
  branch: '├── ',
  last: '└── ',
  vertical: '│   ',
  space: '    ',
  ignoredSuffix: ' (ignored)'
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: 'auto',
  maxFileSizeKb: 10240,
  ignoredExtensions: DEFAULT_IGNORED_EXTENSIONS,
  ignoredPaths: DEFAULT_IGNORED_DIRECTORIES,
  useGitignoreDefault: true,
  pruneIgnoredOnRead: true,
  outputTemplate: '================================================================\nFile: {{path}}\n================================================================\n\n{{content}}\n\n',
  treePlacement: 'top',
  treeWrapper: 'Directory Structure:\n\n{{tree}}\n\n',
  treeSymbols: DEFAULT_TREE_SYMBOLS,
};

function loadGlobalSettings(): GlobalSettings {
  const cached = localStorage.getItem('make1txt_globalSettings');
  return cached ? { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(cached) } : DEFAULT_GLOBAL_SETTINGS;
}

function saveGlobalSettings(settings: GlobalSettings) {
  localStorage.setItem('make1txt_globalSettings', JSON.stringify(settings));
}

function buildExtMap(nodes: FileNode[], settings: GlobalSettings, oldExtMap: Record<string, ExtensionStat>): Record<string, ExtensionStat> {
  const newExtMap: Record<string, ExtensionStat> = {};
  for (const node of nodes) {
    if (!node.isDirectory) {
      const ext = getFileExtension(node.name);
      const isGloballyIgnoredPath = isPathGloballyIgnored(node.relativePath, settings.ignoredPaths);
      const isGloballyIgnoredExt = settings.ignoredExtensions.includes(ext);
      
      if (!isGloballyIgnoredPath && !isGloballyIgnoredExt) {
        if (!newExtMap[ext]) {
          newExtMap[ext] = { count: 0, isActive: oldExtMap[ext]?.isActive ?? true };
        }
        newExtMap[ext].count++;
      }
    }
  }
  return newExtMap;
}

interface FileStore {
  nodes: FileNode[];
  isLoading: boolean;
  scannedFilesCount: number;
  rootHandle: FileSystemDirectoryHandle | null;
  globalSettings: GlobalSettings;
  localFilters: LocalFilters;
  gitignoreRegexes: RegExp[];
  compiledCustomRegexes: RegExp[];
  profiles: Profile[];
  abortController: AbortController | null;
  isRestoredFromProfile: boolean;
  
  activeTab: 'tree' | 'result';
  generatedText: string | null;
  previewNode: FileNode | null;
  
  setActiveTab: (tab: 'tree' | 'result') => void;
  setGeneratedText: (text: string | null) => void;
  setPreviewNode: (node: FileNode | null) => void;

  loadDirectory: () => Promise<void>;
  loadDirectoryFromHandle: (handle: FileSystemDirectoryHandle, applyProfile?: Profile, isRestored?: boolean) => Promise<void>;
  cancelDirectoryLoad: () => void;
  
  updateGlobalSettings: (newSettings: Partial<GlobalSettings>) => void;
  resetGlobalSettings: () => void;
  updateLocalFilters: (newFilters: Partial<LocalFilters>) => void;
  
  toggleExtension: (ext: string) => void;
  setAllExtensionsState: (isActive: boolean) => void;
  addCustomPattern: (pattern: string) => void;
  updateCustomPattern: (id: string, newPattern: string) => void;
  toggleCustomPattern: (id: string) => void;
  removeCustomPattern: (id: string) => void;
  moveCustomPattern: (id: string, direction: 'up' | 'down') => void;
  toggleLocalPathIgnore: (path: string) => void;

  toggleSelection: (id: string, checked: boolean) => void;
  toggleExpand: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getStats: () => GeneratorStats;
  
  fetchProfiles: () => Promise<void>;
  saveCurrentProfile: (name: string, saveDirectory: boolean) => Promise<void>;
  loadProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

export const useFileStore = create<FileStore>((set, get) => {
  const computeNodes = (
    state: FileStore, 
    forceSelectExt?: string, 
    forceSelectAllExts?: boolean
  ): FileNode[] => {
    const { globalSettings, localFilters, gitignoreRegexes, compiledCustomRegexes } = state;
    
    return state.nodes.map(node => {
      let isIgnored = false;

      if (isPathGloballyIgnored(node.relativePath, globalSettings.ignoredPaths)) {
        isIgnored = true;
      }
      if (!node.isDirectory && globalSettings.maxFileSizeKb > 0 && node.sizeBytes > globalSettings.maxFileSizeKb * 1024) {
        isIgnored = true;
      }
      if (!isIgnored && localFilters.useGitignore && gitignoreRegexes.some(rx => rx.test(node.relativePath))) {
        isIgnored = true;
      }
      if (!isIgnored && compiledCustomRegexes.some(rx => rx.test(node.relativePath))) {
        isIgnored = true;
      }
      
      if (!isIgnored && !node.isDirectory) {
        const ext = getFileExtension(node.name);
        if (globalSettings.ignoredExtensions.includes(ext)) {
          isIgnored = true;
        } else {
          const extStat = localFilters.extensions[ext];
          if (extStat && !extStat.isActive) {
            isIgnored = true;
          }
        }
      }

      let isSelected = node.isSelected;
      if (isIgnored) {
        isSelected = false;
      } else if (!node.isDirectory) {
        const ext = getFileExtension(node.name);
        if (forceSelectAllExts) {
          isSelected = true;
        } else if (forceSelectExt === ext) {
          isSelected = true;
        }
      }

      return { ...node, isIgnored, isSelected };
    });
  };

  const recompileAndRecalculate = (state: FileStore): Partial<FileStore> => {
    const activePatterns = state.localFilters.customPatterns.filter(p => p.isActive);
    const compiled = activePatterns.map(p => compileGlobToRegex(p.pattern));
    const tempState = { ...state, compiledCustomRegexes: compiled };
    return { 
      compiledCustomRegexes: compiled,
      nodes: computeNodes(tempState as FileStore) 
    };
  };

  return {
    nodes: [],
    isLoading: false,
    scannedFilesCount: 0,
    rootHandle: null,
    globalSettings: loadGlobalSettings(),
    localFilters: { 
      extensions: {}, 
      customPatterns: [], 
      useGitignore: true, 
      hasGitignore: false, 
      showIgnored: true,
      generateTree: true,
      treeIncludeIgnored: false
    },
    gitignoreRegexes: [],
    compiledCustomRegexes: [],
    profiles: [],
    abortController: null,
    isRestoredFromProfile: false,
    
    activeTab: 'tree',
    generatedText: null,
    previewNode: null,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setGeneratedText: (text) => set({ generatedText: text }),
    setPreviewNode: (node) => set({ previewNode: node }),

    cancelDirectoryLoad: () => {
      get().abortController?.abort();
      set({ isLoading: false, abortController: null, scannedFilesCount: 0 });
    },

    loadDirectory: async () => {
      if (get().isLoading) throw new Error('ALREADY_LOADING');
      const handle = await requestDirectoryAccess();
      await get().loadDirectoryFromHandle(handle, undefined, false);
    },

    loadDirectoryFromHandle: async (handle: FileSystemDirectoryHandle, applyProfile?: Profile, isRestored: boolean = false) => {
      if (get().isLoading) throw new Error('ALREADY_LOADING');
      
      const controller = new AbortController();
      set({ isLoading: true, scannedFilesCount: 0, previewNode: null, abortController: controller });
      
      try {
        const hasPermission = await verifyDirectoryPermission(handle);
        if (!hasPermission) throw new Error('NO_PERMISSION');

        let activeGlobalSettings = get().globalSettings;
        if (applyProfile) {
          activeGlobalSettings = applyProfile.settings;
          set({ globalSettings: activeGlobalSettings });
          saveGlobalSettings(activeGlobalSettings);
        }

        const skipPredicate = activeGlobalSettings.pruneIgnoredOnRead
          ? (name: string, relativePath: string, isDirectory: boolean) => {
              if (isPathGloballyIgnored(relativePath, activeGlobalSettings.ignoredPaths)) return true;
              if (!isDirectory && activeGlobalSettings.ignoredExtensions.includes(getFileExtension(name))) return true;
              return false;
            }
          : undefined;

        const rootId = crypto.randomUUID();
        const rootNode: FileNode = {
          id: rootId,
          name: handle.name,
          relativePath: handle.name,
          isDirectory: true,
          sizeBytes: 0,
          handle: handle,
          depth: 0,
          parentId: null,
          isSelected: true,
          isIgnored: false,
          isExpanded: true,
        };

        const rawChildren = await readDirectoryRecursively(
          handle, 
          (count) => set({ scannedFilesCount: count }),
          controller.signal,
          skipPredicate,
          { count: 0 },
          handle.name,
          1,
          rootId
        );

        const rawNodes = [rootNode, ...rawChildren];
        
        let gitRegexes: RegExp[] = [];
        const gitignoreNode = rawNodes.find(n => n.relativePath === `${handle.name}/.gitignore` && !n.isDirectory);
        const hasGitignore = !!gitignoreNode;
        
        if (hasGitignore) {
          const file = await (gitignoreNode.handle as FileSystemFileHandle).getFile();
          gitRegexes = createIgnoreRegexes(await file.text());
        }

        const extMap = buildExtMap(rawNodes, activeGlobalSettings, {});

        if (applyProfile) {
          Object.keys(extMap).forEach(ext => {
            extMap[ext].isActive = !applyProfile.localFilters.hiddenExtensions.includes(ext);
          });
        }

        const initialState = { 
          ...get(),
          rootHandle: handle,
          gitignoreRegexes: gitRegexes,
          isRestoredFromProfile: isRestored,
          localFilters: {
            extensions: extMap,
            customPatterns: applyProfile ? applyProfile.localFilters.customPatterns : [],
            useGitignore: applyProfile ? applyProfile.localFilters.useGitignore : (hasGitignore && activeGlobalSettings.useGitignoreDefault),
            hasGitignore,
            showIgnored: applyProfile ? (applyProfile.localFilters.showIgnored ?? true) : true,
            generateTree: applyProfile ? (applyProfile.localFilters.generateTree ?? true) : true,
            treeIncludeIgnored: applyProfile ? (applyProfile.localFilters.treeIncludeIgnored ?? false) : false,
          },
          nodes: rawNodes,
          isLoading: false,
          abortController: null,
          activeTab: 'tree' as const
        };

        set({ ...initialState, ...recompileAndRecalculate(initialState) });

      } catch (error) {
        set({ isLoading: false, scannedFilesCount: 0, abortController: null });
        if (error instanceof Error && error.message === 'Scanning cancelled') throw new Error('CANCELLED');
        throw error;
      }
    },

    updateGlobalSettings: (newSettings) => {
      set((state) => {
        const updatedSettings = { ...state.globalSettings, ...newSettings };
        saveGlobalSettings(updatedSettings);
        
        const newExtMap = buildExtMap(state.nodes, updatedSettings, state.localFilters.extensions);
        const newFilters = { ...state.localFilters, extensions: newExtMap };
        
        const tempState = { ...state, globalSettings: updatedSettings, localFilters: newFilters };
        return { 
          globalSettings: updatedSettings, 
          localFilters: newFilters,
          nodes: computeNodes(tempState as FileStore) 
        };
      });
    },

    resetGlobalSettings: () => {
      set((state) => {
        saveGlobalSettings(DEFAULT_GLOBAL_SETTINGS);
        
        const newExtMap = buildExtMap(state.nodes, DEFAULT_GLOBAL_SETTINGS, state.localFilters.extensions);
        const newFilters = { ...state.localFilters, extensions: newExtMap };
        
        const tempState = { ...state, globalSettings: DEFAULT_GLOBAL_SETTINGS, localFilters: newFilters };
        return { 
          globalSettings: DEFAULT_GLOBAL_SETTINGS, 
          localFilters: newFilters,
          nodes: computeNodes(tempState as FileStore) 
        };
      });
    },

    updateLocalFilters: (newFilters) => {
      set((state) => {
        const filters = { ...state.localFilters, ...newFilters };
        return { localFilters: filters, ...recompileAndRecalculate({ ...state, localFilters: filters } as FileStore) };
      });
    },

    toggleExtension: (ext) => {
      set((state) => {
        const extData = state.localFilters.extensions[ext];
        if (!extData) return state;
        const newIsActive = !extData.isActive;
        const newFilters = {
          ...state.localFilters,
          extensions: {
            ...state.localFilters.extensions,
            [ext]: { ...extData, isActive: newIsActive }
          }
        };
        const tempState = { ...state, localFilters: newFilters };
        return {
          localFilters: newFilters,
          nodes: computeNodes(tempState as FileStore, newIsActive ? ext : undefined)
        };
      });
    },

    setAllExtensionsState: (isActive: boolean) => {
      set((state) => {
        const newExts: Record<string, ExtensionStat> = {};
        for (const e in state.localFilters.extensions) {
          newExts[e] = { ...state.localFilters.extensions[e], isActive };
        }
        const newFilters = { ...state.localFilters, extensions: newExts };
        const tempState = { ...state, localFilters: newFilters };
        return {
          localFilters: newFilters,
          nodes: computeNodes(tempState as FileStore, undefined, isActive)
        };
      });
    },

    addCustomPattern: (pattern) => {
      set((state) => {
        const exists = state.localFilters.customPatterns.find(p => p.pattern === pattern);
        if (exists) return state;
        const newFilters = { ...state.localFilters, customPatterns: [...state.localFilters.customPatterns, { id: crypto.randomUUID(), pattern, isActive: true }] };
        return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters } as FileStore) };
      });
    },

    updateCustomPattern: (id, newPattern) => {
      set((state) => {
        const newFilters = { ...state.localFilters, customPatterns: state.localFilters.customPatterns.map(p => p.id === id ? { ...p, pattern: newPattern } : p) };
        return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters } as FileStore) };
      });
    },

    toggleCustomPattern: (id) => {
      set((state) => {
        const newFilters = { ...state.localFilters, customPatterns: state.localFilters.customPatterns.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p) };
        return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters } as FileStore) };
      });
    },

    removeCustomPattern: (id) => {
      set((state) => {
        const newFilters = { ...state.localFilters, customPatterns: state.localFilters.customPatterns.filter(p => p.id !== id) };
        return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters } as FileStore) };
      });
    },

    moveCustomPattern: (id, direction) => {
      set((state) => {
        const patterns = [...state.localFilters.customPatterns];
        const idx = patterns.findIndex(p => p.id === id);
        if (idx < 0) return state;
        if (direction === 'up' && idx > 0) [patterns[idx - 1], patterns[idx]] = [patterns[idx], patterns[idx - 1]];
        else if (direction === 'down' && idx < patterns.length - 1) [patterns[idx + 1], patterns[idx]] = [patterns[idx], patterns[idx + 1]];
        const newFilters = { ...state.localFilters, customPatterns: patterns };
        return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters } as FileStore) };
      });
    },
    
    toggleLocalPathIgnore: (path) => {
      set((state) => {
        const pattern = path;
        const exists = state.localFilters.customPatterns.find(p => p.pattern === pattern);
        
        if (exists) {
          const newPatterns = state.localFilters.customPatterns.filter(p => p.pattern !== pattern);
          const newFilters = { ...state.localFilters, customPatterns: newPatterns };
          
          const pathPrefix = `${path}/`;
          const newNodes = state.nodes.map(n => {
            if (n.relativePath === path || n.relativePath.startsWith(pathPrefix)) {
              return { ...n, isSelected: true };
            }
            return n;
          });
          
          const tempState = { ...state, nodes: newNodes, localFilters: newFilters };
          return { localFilters: newFilters, ...recompileAndRecalculate(tempState as FileStore) };
        } else {
          const newPatterns = [...state.localFilters.customPatterns, { id: crypto.randomUUID(), pattern, isActive: true }];
          const newFilters = { ...state.localFilters, customPatterns: newPatterns };
          return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters } as FileStore) };
        }
      });
    },

    toggleSelection: (id, checked) => {
      set((state) => {
        const target = state.nodes.find(n => n.id === id);
        if (!target || target.isIgnored) return state;

        const pathPrefix = `${target.relativePath}/`;

        const newNodes = state.nodes.map(node => {
          if (node.isIgnored) return node;
          if (node.id === id || node.relativePath.startsWith(pathPrefix)) {
            return { ...node, isSelected: checked };
          }
          return node;
        });

        return { nodes: newNodes };
      });
    },

    toggleExpand: (id) => {
      set((state) => ({
        nodes: state.nodes.map(node => node.id === id ? { ...node, isExpanded: !node.isExpanded } : node)
      }));
    },

    selectAll: () => {
      set((state) => ({
        nodes: state.nodes.map(node => node.isIgnored ? node : { ...node, isSelected: true })
      }));
    },

    deselectAll: () => {
      set((state) => ({
        nodes: state.nodes.map(node => node.isIgnored ? node : { ...node, isSelected: false })
      }));
    },

    getStats: () => {
      const { nodes } = get();
      let totalFiles = 0;
      let selectedFiles = 0;
      let totalSizeBytes = 0;

      for (const node of nodes) {
        if (node.isDirectory) continue;
        if (!node.isIgnored) totalFiles++;
        if (node.isSelected && !node.isIgnored) {
          selectedFiles++;
          totalSizeBytes += node.sizeBytes;
        }
      }

      const estimatedTokens = estimateTokenCount(totalSizeBytes);

      return {
        totalFiles,
        selectedFiles,
        totalSizeBytes,
        totalWords: Math.floor(estimatedTokens * 0.75),
        estimatedTokens,
      };
    },

    fetchProfiles: async () => {
      const data = await dbService.getAllProfiles();
      set({ profiles: data });
    },

    saveCurrentProfile: async (name, saveDirectory) => {
      const { rootHandle, globalSettings, localFilters } = get();
      
      const hiddenExtensions = Object.entries(localFilters.extensions)
        .filter(([, stat]) => !stat.isActive)
        .map(([ext]) => ext);

      const profile: Profile = {
        id: crypto.randomUUID(),
        name,
        lastUsed: Date.now(),
        directoryHandle: saveDirectory && rootHandle ? rootHandle : undefined,
        directoryName: saveDirectory && rootHandle ? rootHandle.name : undefined,
        settings: globalSettings,
        localFilters: {
          hiddenExtensions,
          customPatterns: localFilters.customPatterns,
          useGitignore: localFilters.useGitignore,
          showIgnored: localFilters.showIgnored,
          generateTree: localFilters.generateTree,
          treeIncludeIgnored: localFilters.treeIncludeIgnored
        }
      };

      await dbService.saveProfile(profile);
      await get().fetchProfiles();
    },

    loadProfile: async (profile) => {
      if (get().isLoading) throw new Error('ALREADY_LOADING');
      
      const updatedProfile = { ...profile, lastUsed: Date.now() };
      await dbService.saveProfile(updatedProfile);
      await get().fetchProfiles();

      if (profile.directoryHandle) {
        await get().loadDirectoryFromHandle(profile.directoryHandle, profile, true);
      } else {
        set((state) => {
          const newExts = { ...state.localFilters.extensions };
          Object.keys(newExts).forEach(ext => {
            newExts[ext] = { ...newExts[ext], isActive: !profile.localFilters.hiddenExtensions.includes(ext) };
          });

          const newLocalFilters = {
            ...state.localFilters,
            extensions: newExts,
            customPatterns: profile.localFilters.customPatterns,
            useGitignore: profile.localFilters.useGitignore,
            showIgnored: profile.localFilters.showIgnored ?? true,
            generateTree: profile.localFilters.generateTree ?? true,
            treeIncludeIgnored: profile.localFilters.treeIncludeIgnored ?? false
          };

          const tempState = { ...state, globalSettings: profile.settings, localFilters: newLocalFilters };
          return {
            globalSettings: profile.settings,
            localFilters: newLocalFilters,
            ...recompileAndRecalculate(tempState as FileStore)
          };
        });
        saveGlobalSettings(profile.settings);
      }
    },

    deleteProfile: async (id) => {
      await dbService.deleteProfile(id);
      await get().fetchProfiles();
    }
  };
});