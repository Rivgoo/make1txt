import type { GlobalSettings, TreeSymbols } from '@/core/types/file.types';
import { DEFAULT_IGNORED_DIRECTORIES, DEFAULT_IGNORED_EXTENSIONS } from '@/core/services/IgnoreService';

export const MAX_AUTO_TOKENS = 1_000_000;

export const DEFAULT_TREE_SYMBOLS: TreeSymbols = {
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
  useGitignore: true,
  pruneIgnoredOnRead: true,
  outputTemplate: '================================================================\nFile: {{path}}\n================================================================\n\n{{content}}\n\n',
  treePlacement: 'top',
  treeWrapper: 'Directory Structure:\n\n{{tree}}\n\n',
  treeSymbols: DEFAULT_TREE_SYMBOLS,
};