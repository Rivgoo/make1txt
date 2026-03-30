import type { StateCreator } from 'zustand';
import type { FileStore, SettingsSlice } from '../store.types';
import { loadGlobalSettings, saveGlobalSettings } from '../helpers/settings.helper';
import { buildExtMap, computeNodes } from '../helpers/node.helper';
import { DEFAULT_GLOBAL_SETTINGS } from '../constants';

export const createSettingsSlice: StateCreator<FileStore, [], [], SettingsSlice> = (set, get) => ({
  globalSettings: loadGlobalSettings(),

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
        nodes: computeNodes(tempState) 
      };
    });
    get().evaluateTokenization();
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
        nodes: computeNodes(tempState) 
      };
    });
    get().evaluateTokenization();
  }
});