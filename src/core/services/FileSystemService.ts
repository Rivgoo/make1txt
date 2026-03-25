import type { FileNode } from '../types/file.types';

export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle> {
  try {
    return await window.showDirectoryPicker({ mode: 'read' });
  } catch {
    throw new Error('Користувач скасував вибір папки або доступ заборонено.');
  }
}

export async function verifyDirectoryPermission(
  directoryHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  const permission = await directoryHandle.queryPermission({ mode: 'read' });
  if (permission === 'granted') return true;
  
  const requestResult = await directoryHandle.requestPermission({ mode: 'read' });
  return requestResult === 'granted';
}

export async function readDirectoryRecursively(
  directoryHandle: FileSystemDirectoryHandle,
  onProgress?: (count: number) => void,
  signal?: AbortSignal,
  skipPredicate?: (name: string, relativePath: string, isDirectory: boolean) => boolean,
  state: { count: number } = { count: 0 },
  currentPath: string = '',
  depth: number = 0,
  parentId: string | null = null
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];
  const entries: FileSystemHandle[] = [];

  for await (const entry of directoryHandle.values()) {
    if (signal?.aborted) throw new Error('Scanning cancelled');
    entries.push(entry);
  }

  entries.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });

  for (const entry of entries) {
    if (signal?.aborted) throw new Error('Scanning cancelled');
    
    const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    const isDirectory = entry.kind === 'directory';

    if (skipPredicate && skipPredicate(entry.name, relativePath, isDirectory)) {
      continue;
    }

    state.count++;
    
    if (state.count % 50 === 0) {
      onProgress?.(state.count);
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const nodeId = crypto.randomUUID();

    if (isDirectory) {
      const dirHandle = entry as FileSystemDirectoryHandle;
      
      nodes.push({
        id: nodeId,
        name: entry.name,
        relativePath,
        isDirectory: true,
        sizeBytes: 0,
        handle: dirHandle,
        depth,
        parentId,
        isSelected: true,
        isIgnored: false,
        isExpanded: false,
      });

      const childNodes = await readDirectoryRecursively(
        dirHandle, onProgress, signal, skipPredicate, state, relativePath, depth + 1, nodeId
      );
      nodes.push(...childNodes);
    } else {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      
      nodes.push({
        id: nodeId,
        name: entry.name,
        relativePath,
        isDirectory: false,
        sizeBytes: file.size,
        handle: fileHandle,
        depth,
        parentId,
        isSelected: true,
        isIgnored: false,
        isExpanded: false,
      });
    }
  }

  return nodes;
}