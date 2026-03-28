export const DEFAULT_IGNORED_DIRECTORIES = [
  // Version control
  '.git', '.svn', '.hg', '.bzr',

  // Node.js / JS / Frontend
  'node_modules', 'bower_components', 'jspm_packages',
  '.npm', '.yarn', '.pnpm-store',

  // Python
  'venv', '.venv', 'env', '.env', '__pycache__', '.pytest_cache',
  '.tox', 'eggs', 'wheels', '.mypy_cache', '.ruff_cache',

  // Java / JVM / Android
  'target', '.gradle', '.m2', 'captures',

  // C# / .NET
  'bin', 'obj', 'TestResults', 'packages', '.nuget',

  // C / C++ / Rust / Go
  'Debug', 'Release', 'x64', 'x86', 'pkg',

  // Ruby / PHP
  'vendor', 'bundle',

  // Mobile (iOS / Android)
  'Pods', 'DerivedData', '.symlinks',

  // Build / Output
  'dist', 'build', 'out', 'output', 'dist-ssr',

  // Frameworks & Cache
  '.next', '.nuxt', '.svelte-kit', '.cache', '.parcel-cache',
  '.vuepress', '.serverless', '.meteor', '.expo',

  // Testing / Coverage
  'coverage', '.nyc_output', 'htmlcov',

  // IDE
  '.idea', '.vscode', '.vs', '.fleet',

  // System / Temp
  'tmp', 'temp', 'logs', 'pids',
];

export const DEFAULT_IGNORED_EXTENSIONS = [
  // Images & Design
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
  '.raw', '.heic', '.psd', '.ai', '.xd', '.sketch', '.fig', '.fbx', '.blend', '.stl',

  // Video
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.flv', '.m4v', '.3gp',

  // Audio
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.wma', '.m4a', '.mid', '.midi',

  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.tgz', '.iso', '.cab', '.dmg',

  // Binaries & Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
  '.pyc', '.pyd', '.class', '.jar', '.war', '.ear',
  '.apk', '.aab', '.ipa', '.app',
  '.sys', '.ko', '.el', '.nupkg', '.msi',

  // Documents / Office
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.rtf', '.odt', '.ods', '.odp', '.pages', '.numbers', '.key',

  // Databases
  '.sqlite', '.sqlite3', '.db', '.mdb', '.accdb', '.mdf', '.ldf', '.bson',

  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',

  // Logs, Cache, Maps, Temp
  '.log', '.lock', '.map', '.pdb', '.ilk', '.suo', '.user',
  '.cache', '.tmp', '.temp', '.bak', '.swp', '.pid', '.seed', '.meta',

  // VM / Containers
  '.vmdk', '.vdi', '.vbox', '.ova',

  // Keys & Certs
  '.keystore', '.jks', '.pfx', '.p12', '.der', '.cer', '.crt',
];

/**
 * Parses a .gitignore file content into a list of compiled RegExp matchers.
 */
export function createIgnoreRegexes(gitignoreContent: string): RegExp[] {
  return gitignoreContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map(compileGlobToRegex);
}

export function compileGlobToRegex(pattern: string): RegExp {
  let cleaned = pattern.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  const escaped = cleaned.replace(/[.+^${}()|\\]/g, '\\$&');

  const regexStr = escaped
    .replace(/\*\*/g, '.*')       
    .replace(/\*/g, '[^/]*')      
    .replace(/\?/g, '[^/]');      

  return new RegExp(`(^|/)${regexStr}($|/)`);
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
  ignoredDirs: string[] = DEFAULT_IGNORED_DIRECTORIES,
): boolean {
  const parts = relativePath.split('/');
  return ignoredDirs.some(dir => parts.includes(dir));
}