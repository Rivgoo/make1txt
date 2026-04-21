import type { StateCreator } from 'zustand';
import type { FileStore, DirectorySlice } from '../store.types';
import type { FileNode, LocalFilters } from '@/core/types/file.types';
import { requestDirectoryAccess, readDirectoryRecursively, verifyDirectoryPermission } from '@/core/services/FileSystemService';
import { createIgnoreRegexes, isPathGloballyIgnored } from '@/core/services/IgnoreService';
import { getFileExtension } from '@/core/utils/stats.utils';
import { buildExtMap, recompileAndRecalculate } from '../helpers/node.helper';
import { saveGlobalSettings } from '../helpers/settings.helper';
import { PREDEFINED_OPTIMIZATION_RULES } from '@/core/constants/optimization.constants';
import { DEFAULT_GLOBAL_SETTINGS } from '../constants';

export const createDirectorySlice: StateCreator<FileStore, [], [], DirectorySlice> = (set, get) => ({
  nodes: [],
  isLoading: false,
  scannedFilesCount: 0,
  rootHandle: null,
  abortController: null,
  isRestoredFromProfile: false,
  activeTab: 'tree',
  generatedText: null,
  previewNode: null,
  sessionFileName: null,
  gitignoreRegexes: [],
  compiledCustomRegexes: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setGeneratedText: (text) => set({ generatedText: text }),
  setPreviewNode: (node) => set({ previewNode: node }),
  setSessionFileName: (name) => set({ sessionFileName: name }),

  cancelDirectoryLoad: () => {
    get().abortController?.abort();
    set({ isLoading: false, abortController: null, scannedFilesCount: 0 });
  },

  loadDirectory: async () => {
    if (get().isLoading) throw new Error('ALREADY_LOADING');
    const handle = await requestDirectoryAccess();
    await get().loadDirectoryFromHandle(handle, undefined, false);
  },

  loadDirectoryFromHandle: async (handle, applyProfile, isRestored = false) => {
    if (get().isLoading) throw new Error('ALREADY_LOADING');
    
    get().cancelTokenization();
    const controller = new AbortController();
    
    set({ 
      isLoading: true, 
      scannedFilesCount: 0, 
      previewNode: null, 
      sessionFileName: null,
      abortController: controller,
      realTokenMap: {},
      optimizedBytesMap: {},
      needsManualTokenization: false
    });
    
    try {
      const hasPermission = await verifyDirectoryPermission(handle);
      if (!hasPermission) throw new Error('NO_PERMISSION');

      let activeGlobalSettings = get().globalSettings;
      if (applyProfile) {
        activeGlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS, ...applyProfile.settings };
        set({ globalSettings: activeGlobalSettings });
        saveGlobalSettings(activeGlobalSettings);
      }

      let gitRegexes: RegExp[] = [];
      if (activeGlobalSettings.useGitignore) {
        try {
          const gitignoreHandle = await handle.getFileHandle('.gitignore');
          const file = await gitignoreHandle.getFile();
          gitRegexes = createIgnoreRegexes(await file.text());
        } catch {
          // Ignored if file does not exist
        }
      }

      const skipPredicate = activeGlobalSettings.pruneIgnoredOnRead
        ? (name: string, relativePath: string, isDirectory: boolean) => {
            if (isPathGloballyIgnored(relativePath, activeGlobalSettings.ignoredPaths)) return true;
            if (!isDirectory && activeGlobalSettings.ignoredExtensions.includes(getFileExtension(name))) return true;
            if (gitRegexes.some(rx => rx.test(relativePath))) return true;
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
        handle,
        depth: 0,
        parentId: null,
        isSelected: true,
        isIgnored: false,
        isGloballyIgnored: false,
        isLocallyIgnored: false,
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
      const extMap = buildExtMap(rawNodes, activeGlobalSettings, {});
      
      let localFiltersToApply: Partial<LocalFilters> = {};
      if (applyProfile) {
        const savedFilters = applyProfile.localFilters;

        Object.keys(extMap).forEach(ext => {
          extMap[ext].isActive = !savedFilters.hiddenExtensions.includes(ext);
        });

        localFiltersToApply = {
          customPatterns: savedFilters.customPatterns,
          showGloballyIgnored: savedFilters.showGloballyIgnored ?? false,
          showLocallyIgnored: savedFilters.showLocallyIgnored ?? true,
          showEmptyFolders: savedFilters.showEmptyFolders ?? false,
          generateTree: savedFilters.generateTree ?? true,
          treeIncludeIgnored: savedFilters.treeIncludeIgnored ?? false,
          isOptimizationEnabled: savedFilters.isOptimizationEnabled ?? false,
          isOptimizationDirty: savedFilters.isOptimizationDirty ?? false,
          optimizationRules: savedFilters.optimizationRules ?? PREDEFINED_OPTIMIZATION_RULES,
        };
      }

      const initialState = { 
        ...get(),
        rootHandle: handle,
        gitignoreRegexes: gitRegexes,
        isRestoredFromProfile: isRestored,
        localFilters: {
          extensions: extMap,
          customPatterns: localFiltersToApply.customPatterns ?? [],
          showGloballyIgnored: localFiltersToApply.showGloballyIgnored ?? false,
          showLocallyIgnored: localFiltersToApply.showLocallyIgnored ?? true,
          showEmptyFolders: localFiltersToApply.showEmptyFolders ?? false,
          generateTree: localFiltersToApply.generateTree ?? true,
          treeIncludeIgnored: localFiltersToApply.treeIncludeIgnored ?? false,
          isOptimizationEnabled: localFiltersToApply.isOptimizationEnabled ?? false,
          isOptimizationDirty: localFiltersToApply.isOptimizationDirty ?? false,
          optimizationRules: localFiltersToApply.optimizationRules ?? PREDEFINED_OPTIMIZATION_RULES,
        },
        nodes: rawNodes,
        isLoading: false,
        abortController: null,
        activeTab: 'tree' as const
      };

      set({ ...initialState, ...recompileAndRecalculate(initialState) });
      get().evaluateTokenization();

    } catch (error) {
      set({ isLoading: false, scannedFilesCount: 0, abortController: null });
      if (error instanceof Error && error.message === 'Scanning cancelled') throw new Error('CANCELLED');
      throw error;
    }
  }
});