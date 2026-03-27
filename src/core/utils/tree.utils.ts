import type { FileNode, TreeSymbols } from '../types/file.types';

interface TreeOptions {
  includeIgnored: boolean;
  symbols: TreeSymbols;
}

export function generateTextTree(nodes: FileNode[], options: TreeOptions): string {
  const { includeIgnored, symbols } = options;
  
  const validNodes = includeIgnored ? nodes : nodes.filter(n => !n.isIgnored);
  if (validNodes.length === 0) return '';

  const childrenMap = new Map<string | null, FileNode[]>();
  
  for (const node of validNodes) {
    const parentId = node.parentId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });
  }

  let output = '';

  function traverse(parentId: string | null, prefix: string, isAbsoluteRoot = false) {
    const children = childrenMap.get(parentId) || [];
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      
      const suffix = child.isDirectory ? '/' : '';
      const ignoredMark = child.isIgnored ? symbols.ignoredSuffix : '';
      
      if (isAbsoluteRoot) {
        // Коренева папка не має ліній-відгалужень
        output += `${child.name}${suffix}${ignoredMark}\n`;
        if (child.isDirectory) {
          traverse(child.id, prefix);
        }
      } else {
        const pointer = isLast ? symbols.last : symbols.branch;
        output += `${prefix}${pointer}${child.name}${suffix}${ignoredMark}\n`;
        
        if (child.isDirectory) {
          const extension = isLast ? symbols.space : symbols.vertical;
          traverse(child.id, prefix + extension);
        }
      }
    }
  }

  traverse(null, '', true);
  return output;
}