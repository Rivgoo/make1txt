import type { GlobalSettings } from '@/core/types/file.types';
import { DEFAULT_GLOBAL_SETTINGS } from '../constants';

export function loadGlobalSettings(): GlobalSettings {
  const cached = localStorage.getItem('make1txt_globalSettings');
  if (!cached) return DEFAULT_GLOBAL_SETTINGS;
  
  try {
    return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(cached) };
  } catch {
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  localStorage.setItem('make1txt_globalSettings', JSON.stringify(settings));
}