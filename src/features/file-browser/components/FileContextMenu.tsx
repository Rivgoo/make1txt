// src/features/file-browser/components/FileContextMenu.tsx
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { 
  IconFolder, IconFileText, IconCircleCheck, IconCircleDashed, 
  IconWeight, IconClock, IconRoute, IconFiles, IconLoader2, IconX, 
  IconEye, IconWorld, IconMapPin, IconCopy
} from '@tabler/icons-react';
import type { FileNode } from '@/core/types/file.types';
import type { FolderStat } from '@/store/useFileStore';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import { formatFileSize, getFileExtension } from '@/core/utils/stats.utils';
import './FileContextMenu.css';

interface FileContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  folderStat?: FolderStat;
  onClose: () => void;
}

interface MetaData {
  modified?: string;
  folderSize?: number;
}

export function FileContextMenu({ x, y, node, folderStat, onClose }: FileContextMenuProps) {
  const { 
    toggleSelection, nodes, setPreviewNode, globalSettings, updateGlobalSettings, 
    localFilters, toggleExtension, addCustomPattern 
  } = useFileStore();
  
  const { showToast } = useToast();
  
  const [meta, setMeta] = useState<MetaData | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const ext = !node.isDirectory ? getFileExtension(node.name) : '';
  const isGlobalExtIgnored = !node.isDirectory && globalSettings.ignoredExtensions.includes(ext);
  const isLocalExtIgnored = !node.isDirectory && localFilters.extensions[ext]?.isActive === false;
  const isGlobalFolderIgnored = node.isDirectory && globalSettings.ignoredPaths.includes(node.name);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    let newTop = y;
    let newLeft = x;
    
    if (x + rect.width > vw) newLeft = vw - rect.width - 8;
    if (y + rect.height > vh) newTop = vh - rect.height - 8;
    
    menuRef.current.style.top = `${newTop}px`;
    menuRef.current.style.left = `${newLeft}px`;
    menuRef.current.style.visibility = 'visible';
  }, [x, y]);

  useEffect(() => {
    let isMounted = true;

    const fetchMeta = async () => {
      if (node.isDirectory) {
        const prefix = node.relativePath + '/';
        const descendants = nodes.filter(n => !n.isDirectory && n.relativePath.startsWith(prefix));
        const size = descendants.reduce((acc, curr) => acc + curr.sizeBytes, 0);
        
        if (isMounted) {
          setMeta({ folderSize: size });
          setIsLoadingMeta(false);
        }
      } else {
        try {
          const file = await (node.handle as FileSystemFileHandle).getFile();
          if (isMounted) {
            setMeta({ modified: new Date(file.lastModified).toLocaleString() });
            setIsLoadingMeta(false);
          }
        } catch {
          if (isMounted) {
            setMeta({ modified: 'Недоступно' });
            setIsLoadingMeta(false);
          }
        }
      }
    };

    fetchMeta();
    return () => { isMounted = false; };
  }, [node, nodes]);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.relativePath).then(() => {
      showToast('success', 'Скопійовано', 'Відносний шлях скопійовано.');
    }).catch(() => {
      showToast('error', 'Помилка', 'Не вдалося скопіювати шлях.');
    });
    onClose();
  };

  const handleToggleSelection = () => {
    toggleSelection(node.id, !node.isSelected);
    onClose();
  };

  const handlePreview = () => {
    setPreviewNode(node);
    onClose();
  };

  const handleToggleLocalPath = () => {
    const pattern = node.isDirectory ? `${node.relativePath}/**` : node.relativePath;
    addCustomPattern(pattern);
    showToast('info', 'Локальний фільтр', `Шлях "${pattern}" додано до ігнорування.`);
    onClose();
  };

  const handleToggleGlobalExt = () => {
    if (isGlobalExtIgnored) {
      updateGlobalSettings({ ignoredExtensions: globalSettings.ignoredExtensions.filter(e => e !== ext) });
    } else {
      updateGlobalSettings({ ignoredExtensions: [...globalSettings.ignoredExtensions, ext] });
    }
    onClose();
  };

  const handleToggleLocalExt = () => {
    toggleExtension(ext);
    onClose();
  };

  const handleToggleGlobalFolder = () => {
    if (isGlobalFolderIgnored) {
      updateGlobalSettings({ ignoredPaths: globalSettings.ignoredPaths.filter(p => p !== node.name) });
    } else {
      updateGlobalSettings({ ignoredPaths: [...globalSettings.ignoredPaths, node.name] });
    }
    onClose();
  };

  return (
    <div className="context-menu-overlay" onContextMenu={(e) => { e.preventDefault(); onClose(); }} onClick={onClose}>
      <div 
        ref={menuRef}
        className="context-menu" 
        style={{ visibility: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="context-menu-header">
          <div className="context-menu-header-info">
            {node.isDirectory ? <IconFolder size={20} className="context-menu-header-icon" /> : <IconFileText size={20} className="context-menu-header-icon" />}
            <span className="context-menu-header-title" title={node.name}>{node.name}</span>
          </div>
          <button className="context-menu-close-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>

        <div className="context-menu-section-title">Дії</div>
        
        {!node.isDirectory && (
          <button className="context-menu-action" onClick={handlePreview}>
            <IconEye size={18} /> Переглянути вміст
          </button>
        )}

        <button className="context-menu-action" onClick={handleCopyPath}>
          <IconCopy size={18} /> Скопіювати відносний шлях
        </button>

        {!node.isIgnored && (
          <button 
            className={`context-menu-action ${node.isSelected ? 'action-exclude' : 'action-include'}`}
            onClick={handleToggleSelection}
          >
            {node.isSelected ? <IconCircleDashed size={18} /> : <IconCircleCheck size={18} />}
            {node.isSelected ? 'Зняти виділення' : 'Виділити'}
          </button>
        )}

        <div className="context-menu-divider" />
        <div className="context-menu-section-title">Локальні фільтри (сеанс)</div>

        <button className="context-menu-action action-exclude" onClick={handleToggleLocalPath}>
          <IconMapPin size={18} /> 
          {node.isDirectory ? 'Ігнорувати папку' : 'Ігнорувати файл'}
        </button>

        {!node.isDirectory && !isGlobalExtIgnored && ext !== 'no-extension' && (
          <button className={`context-menu-action ${isLocalExtIgnored ? 'action-include' : 'action-exclude'}`} onClick={handleToggleLocalExt}>
            <IconMapPin size={18} /> 
            {isLocalExtIgnored ? 'Включити розширення' : 'Ігнорувати розширення'}
            <span className="context-menu-action-desc">{ext}</span>
          </button>
        )}

        <div className="context-menu-divider" />
        <div className="context-menu-section-title">Глобальні правила (назавжди)</div>

        {node.isDirectory ? (
          <button className={`context-menu-action ${isGlobalFolderIgnored ? 'action-include' : 'action-exclude'}`} onClick={handleToggleGlobalFolder}>
            <IconWorld size={18} /> 
            {isGlobalFolderIgnored ? 'Не ігнорувати папку' : 'Завжди ігнорувати папку'}
            <span className="context-menu-action-desc">{node.name}</span>
          </button>
        ) : (
          ext !== 'no-extension' && (
            <button className={`context-menu-action ${isGlobalExtIgnored ? 'action-include' : 'action-exclude'}`} onClick={handleToggleGlobalExt}>
              <IconWorld size={18} /> 
              {isGlobalExtIgnored ? 'Не ігнорувати розширення' : 'Завжди ігнорувати розширення'}
              <span className="context-menu-action-desc">{ext}</span>
            </button>
          )
        )}

        <div className="context-menu-meta">
          <div className="meta-row">
            <IconRoute size={16} className="meta-icon" />
            <div className="meta-details">
              <span className="meta-label">Шлях</span>
              <span className="meta-value">{node.relativePath}</span>
            </div>
          </div>

          <div className="meta-row">
            <IconWeight size={16} className="meta-icon" />
            <div className="meta-details">
              <span className="meta-label">Розмір</span>
              <span className="meta-value">
                {node.isDirectory && isLoadingMeta ? <IconLoader2 size={12} className="spin" /> : formatFileSize(node.isDirectory ? (meta?.folderSize || 0) : node.sizeBytes)}
              </span>
            </div>
          </div>

          {node.isDirectory ? (
            <div className="meta-row">
              <IconFiles size={16} className="meta-icon" />
              <div className="meta-details">
                <span className="meta-label">Файли</span>
                <span className="meta-value">
                  {folderStat ? `${folderStat.selected} / ${folderStat.total} вибрано` : 'Обчислення...'}
                </span>
              </div>
            </div>
          ) : (
            <div className="meta-row">
              <IconClock size={16} className="meta-icon" />
              <div className="meta-details">
                <span className="meta-label">Змінено</span>
                <span className="meta-value">
                  {isLoadingMeta ? <IconLoader2 size={12} className="spin" /> : meta?.modified}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}