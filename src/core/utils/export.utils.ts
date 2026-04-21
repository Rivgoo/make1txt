import { formatFileSize } from './stats.utils';
import type { SaveStrategy } from '../types/file.types';

export interface FileNameContext {
  folder: string;
  filesCount: number;
  sizeBytes: number;
}

export function sanitizeFileName(name: string): string {
  const illegalRe = /[/?<>\\:*|"]/g;
  // eslint-disable-next-line no-control-regex
  const controlRe = new RegExp('[\\x00-\\x1f\\x80-\\x9f]', 'g');
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  let sanitized = name
    .replace(illegalRe, '_')
    .replace(controlRe, '')
    .trim();

  if (reservedRe.test(sanitized) || windowsReservedRe.test(sanitized)) {
    sanitized = `_${sanitized}_`;
  }

  return sanitized || 'export';
}

function parseTimestamp(format: string): string {
  const now = new Date();
  
  const map: Record<string, string> = {
    YYYY: String(now.getFullYear()),
    YY: String(now.getFullYear()).slice(-2),
    MM: String(now.getMonth() + 1).padStart(2, '0'),
    DD: String(now.getDate()).padStart(2, '0'),
    HH: String(now.getHours()).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
    ss: String(now.getSeconds()).padStart(2, '0'),
  };

  let result = format;
  for (const [key, val] of Object.entries(map)) {
    result = result.replace(new RegExp(key, 'g'), val);
  }

  return result;
}

export function evaluateFileName(template: string, ctx: FileNameContext): string {
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

  let result = template
    .replace(/\{\{folder\}\}/g, ctx.folder)
    .replace(/\{\{files\}\}/g, String(ctx.filesCount))
    .replace(/\{\{size\}\}/g, formatFileSize(ctx.sizeBytes).replace(/\s/g, ''))
    .replace(/\{\{date\}\}/g, defaultDate)
    .replace(/\{\{time\}\}/g, defaultTime);

  result = result.replace(/\{\{timestamp:([^}]+)\}\}/g, (_, format) => {
    return parseTimestamp(format);
  });

  if (!result.toLowerCase().endsWith('.txt')) {
    result += '.txt';
  }

  return sanitizeFileName(result);
}

export async function executeDownload(text: string, fileName: string, strategy: SaveStrategy): Promise<void> {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

  if (strategy === 'ask' && 'showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Text Files',
          accept: { 'text/plain': ['.txt'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('CANCELLED');
      }
      console.warn('Native picker failed, falling back to default download:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}