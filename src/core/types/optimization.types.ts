export type RuleCategory = 'c-style' | 'script-style' | 'markup-style' | 'whitespace' | 'custom';

export interface OptimizationRule {
  id: string;
  name: string;
  category: RuleCategory;
  isActive: boolean;
  isPredefined: boolean;
  pattern: string;
  flags: string;
  replacement: string;
}

export interface OptimizationResult {
  optimizedText: string;
  originalBytes: number;
  optimizedBytes: number;
}