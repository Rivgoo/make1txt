const BYTES_IN_KILOBYTE = 1024;

const CHARS_PER_TOKEN = 4;

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(BYTES_IN_KILOBYTE)),
    units.length - 1,
  );
  const size = bytes / Math.pow(BYTES_IN_KILOBYTE, unitIndex);
  const formatted = size >= 10 ? Math.round(size) : +size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

/**
 * Estimates token count from a character length.
 * Accepts either a plain char count or a byte size — both give a rough
 * approximation that is good enough for the stats panel.
 */
export function estimateTokenCount(charOrByteLength: number): number {
  return Math.ceil(charOrByteLength / CHARS_PER_TOKEN);
}

const WORD_REGEX = /\b\w+\b/g;

export function countWords(text: string): number {
  return (text.match(WORD_REGEX) ?? []).length;
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx <= 0 || idx === filename.length - 1) return 'no-extension';
  return filename.slice(idx).toLowerCase();
}