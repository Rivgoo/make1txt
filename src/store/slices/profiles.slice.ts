import type { StateCreator } from 'zustand';
import type { FileStore, ProfilesSlice } from '../store.types';
import type { Profile } from '@/core/types/file.types';
import { dbService } from '@/core/services/DatabaseService';
import { recompileAndRecalculate } from '../helpers/node.helper';
import { saveGlobalSettings } from '../helpers/settings.helper';

export const createProfilesSlice: StateCreator<FileStore, [], [], ProfilesSlice> = (set, get) => ({
  profiles: [],

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
        showGloballyIgnored: localFilters.showGloballyIgnored,
        showLocallyIgnored: localFilters.showLocallyIgnored,
        showEmptyFolders: localFilters.showEmptyFolders,
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
        
        const savedFilters = profile.localFilters;

        const newLocalFilters = {
          ...state.localFilters,
          extensions: newExts,
          customPatterns: savedFilters.customPatterns,
          showGloballyIgnored: savedFilters.showGloballyIgnored ?? false,
          showLocallyIgnored: savedFilters.showLocallyIgnored ?? true,
          showEmptyFolders: savedFilters.showEmptyFolders ?? false,
          generateTree: savedFilters.generateTree ?? true,
          treeIncludeIgnored: savedFilters.treeIncludeIgnored ?? false
        };

        const tempState = { ...state, globalSettings: profile.settings, localFilters: newLocalFilters };
        return {
          globalSettings: profile.settings,
          localFilters: newLocalFilters,
          ...recompileAndRecalculate(tempState)
        };
      });
      
      saveGlobalSettings(profile.settings);
      get().evaluateTokenization();
    }
  },

  deleteProfile: async (id) => {
    await dbService.deleteProfile(id);
    await get().fetchProfiles();
  }
});