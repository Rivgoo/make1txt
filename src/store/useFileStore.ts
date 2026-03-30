import { create } from 'zustand';
import type { FileStore } from './store.types';
import { createDirectorySlice } from './slices/directory.slice';
import { createSettingsSlice } from './slices/settings.slice';
import { createFiltersSlice } from './slices/filters.slice';
import { createSelectionSlice } from './slices/selection.slice';
import { createTokenizationSlice } from './slices/tokenization.slice';
import { createProfilesSlice } from './slices/profiles.slice';

export * from './store.types';
export * from './constants';

export const useFileStore = create<FileStore>()((...a) => ({
  ...createDirectorySlice(...a),
  ...createSettingsSlice(...a),
  ...createFiltersSlice(...a),
  ...createSelectionSlice(...a),
  ...createTokenizationSlice(...a),
  ...createProfilesSlice(...a)
}));