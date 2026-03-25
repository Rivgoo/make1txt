const BYTES_IN_KILOBYTE = 1024;
const TOKENS_PER_CHARACTER = 0.25;

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(BYTES_IN_KILOBYTE));
  const size = bytes / Math.pow(BYTES_IN_KILOBYTE, unitIndex);
  
  const formattedSize = size >= 10 ? Math.round(size) : Number(size.toFixed(1));
  return `${formattedSize} ${units[unitIndex]}`;
}

export function estimateTokenCount(textLength: number): number {
  return Math.ceil(textLength * TOKENS_PER_CHARACTER);
}

export function countWords(text: string): number {
  const words = text.match(/\b\w+\b/g);
  return words ? words.length : 0;
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  
  if (idx <= 0 || idx === filename.length - 1) {
    return 'no-extension';
  }
  
  return filename.slice(idx).toLowerCase();
}