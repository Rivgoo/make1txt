import type { OptimizationRule } from '../types/optimization.types';

export const PREDEFINED_OPTIMIZATION_RULES: OptimizationRule[] = [
  {
    id: 'opt-c-line',
    name: 'Remove // comments',
    category: 'c-style',
    isActive: false,
    isPredefined: true,
    pattern: '\\/\\/.*$',
    flags: 'gm',
    replacement: ''
  },
  {
    id: 'opt-c-block',
    name: 'Remove /* */ comments',
    category: 'c-style',
    isActive: false,
    isPredefined: true,
    pattern: '\\/\\*[\\s\\S]*?\\*\\/',
    flags: 'gm',
    replacement: '\n'
  },
  {
    id: 'opt-csharp-xml',
    name: 'Remove /// XML docs',
    category: 'c-style',
    isActive: false,
    isPredefined: true,
    pattern: '^\\s*\\/\\/\\/.*$',
    flags: 'gm',
    replacement: ''
  },
  {
    id: 'opt-script-line',
    name: 'Remove # comments',
    category: 'script-style',
    isActive: false,
    isPredefined: true,
    pattern: '#.*$',
    flags: 'gm',
    replacement: ''
  },
  {
    id: 'opt-markup-block',
    name: 'Remove <!-- --> comments',
    category: 'markup-style',
    isActive: false,
    isPredefined: true,
    pattern: '<!--[\\s\\S]*?-->',
    flags: 'gm',
    replacement: ''
  },
  {
    id: 'opt-whitespace-empty',
    name: 'Collapse multiple empty lines',
    category: 'whitespace',
    isActive: false,
    isPredefined: true,
    pattern: '([ \\t]*\\r?\\n){3,}',
    flags: 'gm',
    replacement: '\n\n'
  }
];