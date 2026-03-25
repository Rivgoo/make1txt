export const DEFAULT_IGNORED_DIRECTORIES = [
  // Системи контролю версій
  '.git', '.svn', '.hg', '.bzr',
  
  // Node.js / JavaScript / Frontend
  'node_modules', 'bower_components', 'jspm_packages', 
  '.npm', '.yarn', '.pnpm-store',

  // Python
  'venv', '.venv', 'env', '.env', '__pycache__', '.pytest_cache', 
  '.tox', 'eggs', 'wheels', '.mypy_cache', '.ruff_cache',

  // Java / JVM / Android
  'target', '.gradle', 'buildSrc/build', '.m2', 'captures',

  // C# / .NET
  'bin', 'obj', 'TestResults', 'packages', '.nuget',

  // C / C++ / Rust / Go
  'Debug', 'Release', 'x64', 'x86', 'pkg',

  // Ruby / PHP
  'vendor', 'bundle', 'vendor/bundle',

  // Мобільна розробка (iOS / Android)
  'Pods', 'DerivedData', '.symlinks', '.xcworkspace',

  // Папки збірки (Build / Output)
  'dist', 'build', 'out', 'output', 'dist-ssr',

  // Фреймворки та Кеш (Next, Nuxt, Vue, Angular, etc.)
  '.next', '.nuxt', '.svelte-kit', '.cache', '.parcel-cache', 
  '.vuepress', '.serverless', '.meteor', '.expo',

  // Тестування та Покриття (Coverage)
  'coverage', '.nyc_output', 'htmlcov',

  // IDE та Редактори
  '.idea', '.vscode', '.vs', '.fleet', '.settings', 'nbproject', '.eclipse',

  // Системні та Тимчасові папки
  'tmp', 'temp', 'logs', 'pids', '.DS_Store', 'Thumbs.db', 'Trash'
];

export const DEFAULT_IGNORED_EXTENSIONS = [
  // Зображення та Дизайн
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff', 
  '.raw', '.heic', '.psd', '.ai', '.xd', '.sketch', '.fig', '.fbx', '.blend', '.stl',

  // Відео
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.flv', '.m4v', '.3gp',

  // Аудіо
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.wma', '.m4a', '.mid', '.midi',

  // Архіви та Стиснення
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.tgz', '.iso', '.cab', '.dmg',

  // Бінарні файли та Виконувані файли
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib', 
  '.pyc', '.pyd', '.class', '.jar', '.war', '.ear', 
  '.apk', '.aab', '.ipa', '.app', 
  '.sys', '.ko', '.el', '.nupkg', '.msi',

  // Документи / Офіс
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
  '.rtf', '.odt', '.ods', '.odp', '.pages', '.numbers', '.key',

  // Бази даних
  '.sqlite', '.sqlite3', '.db', '.mdb', '.accdb', '.mdf', '.ldf', '.ndf', '.frm', '.ibd', '.bson',

  // Шрифти
  '.ttf', '.otf', '.woff', '.woff2', '.eot',

  // Логи, Кеш, Мапи та Тимчасові файли
  '.log', '.lock', '.map', '.pdb', '.ilk', '.suo', '.user', 
  '.cache', '.tmp', '.temp', '.bak', '.swp', '.pid', '.seed', '.meta',

  // Віртуальні машини та Контейнери
  '.vmdk', '.vdi', '.vbox', '.ova', '.tar.gz',

  // Ключі та Сертифікати (Бінарні)
  '.keystore', '.jks', '.pfx', '.p12', '.der', '.cer', '.crt'
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