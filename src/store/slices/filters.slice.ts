import type { StateCreator } from 'zustand';
import type { FileStore, FiltersSlice } from '../store.types';
import type { ExtensionStat } from '@/core/types/file.types';
import { computeNodes, recompileAndRecalculate } from '../helpers/node.helper';
import { PREDEFINED_OPTIMIZATION_RULES } from '@/core/constants/optimization.constants';

export const createFiltersSlice: StateCreator<FileStore, [], [], FiltersSlice> = (set, get) => ({
  localFilters: { 
    extensions: {}, 
    customPatterns: [], 
    showGloballyIgnored: false,
    showLocallyIgnored: true,
    showEmptyFolders: false,
    generateTree: true,
    treeIncludeIgnored: false,
    isOptimizationEnabled: false,
    isOptimizationDirty: false,
    optimizationRules: PREDEFINED_OPTIMIZATION_RULES
  },

  updateLocalFilters: (newFilters) => {
    set((state) => {
      const filters = { ...state.localFilters, ...newFilters };
      const tempState = { ...state, localFilters: filters };
      return { localFilters: filters, ...recompileAndRecalculate(tempState) };
    });
    get().evaluateTokenization();
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
        nodes: computeNodes(tempState, newIsActive ? ext : undefined)
      };
    });
    get().evaluateTokenization();
  },

  setAllExtensionsState: (isActive) => {
    set((state) => {
      const newExts: Record<string, ExtensionStat> = {};
      for (const e in state.localFilters.extensions) {
        newExts[e] = { ...state.localFilters.extensions[e], isActive };
      }
      
      const newFilters = { ...state.localFilters, extensions: newExts };
      const tempState = { ...state, localFilters: newFilters };
      
      return {
        localFilters: newFilters,
        nodes: computeNodes(tempState, undefined, isActive)
      };
    });
    get().evaluateTokenization();
  },

  addCustomPattern: (pattern) => {
    set((state) => {
      const exists = state.localFilters.customPatterns.find(p => p.pattern === pattern);
      if (exists) return state;
      
      const newFilters = { 
        ...state.localFilters, 
        customPatterns: [...state.localFilters.customPatterns, { id: crypto.randomUUID(), pattern, isActive: true }] 
      };
      return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters }) };
    });
    get().evaluateTokenization();
  },

  updateCustomPattern: (id, newPattern) => {
    set((state) => {
      const newFilters = { 
        ...state.localFilters, 
        customPatterns: state.localFilters.customPatterns.map(p => p.id === id ? { ...p, pattern: newPattern } : p) 
      };
      return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters }) };
    });
    get().evaluateTokenization();
  },

  toggleCustomPattern: (id) => {
    set((state) => {
      const newFilters = { 
        ...state.localFilters, 
        customPatterns: state.localFilters.customPatterns.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p) 
      };
      return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters }) };
    });
    get().evaluateTokenization();
  },

  removeCustomPattern: (id) => {
    set((state) => {
      const newFilters = { 
        ...state.localFilters, 
        customPatterns: state.localFilters.customPatterns.filter(p => p.id !== id) 
      };
      return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters }) };
    });
    get().evaluateTokenization();
  },

  moveCustomPattern: (id, direction) => {
    set((state) => {
      const patterns = [...state.localFilters.customPatterns];
      const idx = patterns.findIndex(p => p.id === id);
      if (idx < 0) return state;
      
      if (direction === 'up' && idx > 0) {
        [patterns[idx - 1], patterns[idx]] = [patterns[idx], patterns[idx - 1]];
      } else if (direction === 'down' && idx < patterns.length - 1) {
        [patterns[idx + 1], patterns[idx]] = [patterns[idx], patterns[idx + 1]];
      }
      
      const newFilters = { ...state.localFilters, customPatterns: patterns };
      return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters }) };
    });
    get().evaluateTokenization();
  },

  toggleLocalPathIgnore: (path) => {
    set((state) => {
      const exists = state.localFilters.customPatterns.find(p => p.pattern === path);
      
      if (exists) {
        const newPatterns = state.localFilters.customPatterns.filter(p => p.pattern !== path);
        const newFilters = { ...state.localFilters, customPatterns: newPatterns };
        
        const pathPrefix = `${path}/`;
        const newNodes = state.nodes.map(n => {
          if (n.relativePath === path || n.relativePath.startsWith(pathPrefix)) {
            return { ...n, isSelected: true };
          }
          return n;
        });
        
        const tempState = { ...state, nodes: newNodes, localFilters: newFilters };
        return { localFilters: newFilters, ...recompileAndRecalculate(tempState) };
      } else {
        const newPatterns = [...state.localFilters.customPatterns, { id: crypto.randomUUID(), pattern: path, isActive: true }];
        const newFilters = { ...state.localFilters, customPatterns: newPatterns };
        return { localFilters: newFilters, ...recompileAndRecalculate({ ...state, localFilters: newFilters }) };
      }
    });
    get().evaluateTokenization();
  }
});