import type { OptimizationRule, OptimizationResult } from '../types/optimization.types';

const STRING_LITERAL_REGEX = '("([^"\\\\]|\\\\.)*"|\'([^\'\\\\]|\\\\.)*\'|`([^`\\\\]|\\\\.)*`)';

export function compileSafeRegex(rule: OptimizationRule): RegExp {
  const safePattern = `${STRING_LITERAL_REGEX}|(${rule.pattern})`;
  return new RegExp(safePattern, rule.flags);
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function optimizeText(
  text: string, 
  rules: OptimizationRule[], 
  previewDiff = false
): OptimizationResult {
  const activeRules = rules.filter(r => r.isActive);
  const originalBytes = new Blob([text]).size;

  if (activeRules.length === 0) {
    return {
      optimizedText: previewDiff ? escapeHtml(text) : text,
      originalBytes,
      optimizedBytes: originalBytes
    };
  }

  let processedText = text;
  const placeholders = new Map<string, string>();
  let pCounter = 0;

  for (const rule of activeRules) {
    try {
      const regex = compileSafeRegex(rule);
      processedText = processedText.replace(regex, (match, stringLiteralGroup) => {
        if (stringLiteralGroup !== undefined) {
          return match;
        }
        
        if (previewDiff) {
          const id = `__M1TXT_REMOVED_${pCounter++}__`;
          placeholders.set(id, match);
          return id + rule.replacement;
        }

        return rule.replacement;
      });
    } catch (err) {
      console.warn(`[Optimization] Failed to apply rule ${rule.name}:`, err);
    }
  }

  if (previewDiff) {
    let html = escapeHtml(processedText);
    placeholders.forEach((originalMatch, id) => {
      const escapedMatch = escapeHtml(originalMatch);
      html = html.replace(id, `<span class="diff-removed">${escapedMatch}</span>`);
    });
    
    return {
      optimizedText: html,
      originalBytes,
      optimizedBytes: new Blob([processedText]).size
    };
  }

  return {
    optimizedText: processedText,
    originalBytes,
    optimizedBytes: new Blob([processedText]).size
  };
}