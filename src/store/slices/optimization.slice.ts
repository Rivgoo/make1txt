import type { StateCreator } from 'zustand';
import type { FileStore, OptimizationSlice } from '../store.types';
import { PREDEFINED_OPTIMIZATION_RULES } from '@/core/constants/optimization.constants';

export const createOptimizationSlice: StateCreator<FileStore, [], [], OptimizationSlice> = (set, get) => ({
  
  toggleOptimization: (isEnabled) => {
    set((state) => ({
      localFilters: { 
        ...state.localFilters, 
        isOptimizationEnabled: isEnabled,
        isOptimizationDirty: true,
        optimizationRules: state.localFilters.optimizationRules || PREDEFINED_OPTIMIZATION_RULES
      }
    }));
  },

  toggleOptimizationRule: (id) => {
    set((state) => {
      const currentRules = state.localFilters.optimizationRules || PREDEFINED_OPTIMIZATION_RULES;
      const newRules = currentRules.map(rule => 
        rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
      );
      return { 
        localFilters: { 
          ...state.localFilters, 
          optimizationRules: newRules,
          isOptimizationDirty: true 
        } 
      };
    });
  },

  addCustomOptimizationRule: (ruleData) => {
    set((state) => {
      const currentRules = state.localFilters.optimizationRules || PREDEFINED_OPTIMIZATION_RULES;
      const newRule = { ...ruleData, id: crypto.randomUUID(), isPredefined: false };
      return { 
        localFilters: { 
          ...state.localFilters, 
          optimizationRules: [...currentRules, newRule],
          isOptimizationDirty: true 
        } 
      };
    });
  },

  removeCustomOptimizationRule: (id) => {
    set((state) => {
      const currentRules = state.localFilters.optimizationRules || PREDEFINED_OPTIMIZATION_RULES;
      const newRules = currentRules.filter(rule => rule.id !== id);
      return { 
        localFilters: { 
          ...state.localFilters, 
          optimizationRules: newRules,
          isOptimizationDirty: true 
        } 
      };
    });
  },

  updateCustomOptimizationRule: (id, updates) => {
    set((state) => {
      const currentRules = state.localFilters.optimizationRules || PREDEFINED_OPTIMIZATION_RULES;
      const newRules = currentRules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      );
      return { 
        localFilters: { 
          ...state.localFilters, 
          optimizationRules: newRules,
          isOptimizationDirty: true 
        } 
      };
    });
  },

  applyOptimization: () => {
    get().invalidateTokens();
    set((state) => ({
      localFilters: {
        ...state.localFilters,
        isOptimizationDirty: false
      }
    }));
    get().runTokenization(true);
  }
});