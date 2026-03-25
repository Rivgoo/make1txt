// src/core/services/IgnoreService.ts
export const DEFAULT_IGNORED_DIRECTORIES = [
  '.git', 'node_modules', 'dist', 'build', 'out', 'bin', 'obj', 
  '.idea', '.vscode', 'vendor', 'coverage', 'venv', '__pycache__', 
  '.next', '.nuxt', '.serverless', 'target'
];

export const DEFAULT_IGNORED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
  '.mp4', '.mp3', '.wav', '.avi', '.mov', '.mkv',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib', '.pyc', '.pyd',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.map', '.lock', '.log', '.sqlite', '.db'
];

export function createIgnoreRegexes(gitignoreContent: string): RegExp[] {
  const lines = gitignoreContent.split('\n');
  const validLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.startsWith('#'));

  return validLines.map(pattern => compileGlobToRegex(pattern));
}

export function compileGlobToRegex(pattern: string): RegExp {
  const escapedPattern = pattern
    .replace(/[.+^$()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/(?<!\.)\*/g, '[^/]*')
    .replace(/\?/g, '.');
    
  return new RegExp(`^${escapedPattern}$|/${escapedPattern}$|/${escapedPattern}/`);
}

export function isValidGlobOrRegex(pattern: string): boolean {
  if (!pattern.trim()) return false;
  try {
    compileGlobToRegex(pattern);
    return true;
  } catch {
    return false;
  }
}

export function isPathGloballyIgnored(
  relativePath: string, 
  ignoredDirs: string[] = DEFAULT_IGNORED_DIRECTORIES
): boolean {
  return ignoredDirs.some(dir => 
    relativePath.includes(`/${dir}/`) || relativePath.startsWith(`${dir}/`) || relativePath === dir
  );
}