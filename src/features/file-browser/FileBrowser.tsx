import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconFolderOpen, IconLoader2, IconSearch, IconFileOff, 
  IconListTree, IconCode, IconChecks, IconSquareX, IconFiles, IconSquareRoundedX
} from '@tabler/icons-react';
import { Button } from '@/shared/ui/Button/Button';
import { VirtualList } from '@/shared/ui/VirtualList/VirtualList';
import { FileTreeNode } from './components/FileTreeNode';
import type { FolderStat } from '@/store/useFileStore';
import { FileContextMenu } from './components/FileContextMenu';
import { ResultViewer } from './components/ResultViewer';
import { FilePreview } from './components/FilePreview';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import type { FileNode } from '@/core/types/file.types';
import '../layout/Layout.css';
import './FileBrowser.css';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  node: FileNode | null;
}

export function FileBrowser() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, node: null });
  
  const [previewHeight, setPreviewHeight] = useState(400);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const resizeState = useRef({ startY: 0, startHeight: 0 });
  const isResizingRef = useRef(false);

  const { 
    nodes, isLoading, scannedFilesCount, loadDirectory, cancelDirectoryLoad, toggleExpand, toggleSelection, 
    activeTab, setActiveTab, generatedText, selectAll, deselectAll, previewNode, setPreviewNode, localFilters 
  } = useFileStore();
  
  const { showToast } = useToast();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const deltaY = resizeState.current.startY - e.clientY;
      let newHeight = resizeState.current.startHeight + deltaY;
      
      if (newHeight < 60) newHeight = 60;
      
      setPreviewHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizingPreview(false);
        
        setPreviewHeight((prev) => {
          if (prev <= 60) {
            setPreviewNode(null);
            return 400; 
          }
          return prev;
        });
      }
    };

    if (isResizingPreview) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPreview, setPreviewNode]);

  const handlePreviewResizeStart = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    setIsResizingPreview(true);
    resizeState.current = { startY: e.clientY, startHeight: previewHeight };
  };

  const handleSelectFolder = async () => {
    try {
      await loadDirectory();
      showToast('success', t('common.success'), t('browser.folderLoaded'));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'CANCELLED') {
          showToast('warning', t('common.warning'), t('browser.scanCancelled'));
        } else if (error.message === 'ALREADY_LOADING') {
          showToast('warning', t('common.wait'), t('browser.alreadyLoading'));
        } else if (error.message === 'NO_PERMISSION') {
          showToast('error', t('common.error'), t('browser.noPermission'));
        } else {
          showToast('error', t('common.error'), error.message);
        }
      }
    }
  };

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) setSearchTerm('');
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, node });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const folderStats = useMemo(() => {
    const stats: Record<string, FolderStat> = {};

    for (const node of nodes) {
      if (node.isDirectory) {
        stats[node.relativePath] = { total: 0, selected: 0, absoluteTotal: 0 };
      }
    }

    for (const node of nodes) {
      if (!node.isDirectory) {
        const parts = node.relativePath.split('/');
        parts.pop(); // Відкидаємо ім'я файлу
        
        let currentPath = '';
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (stats[currentPath]) {
            stats[currentPath].absoluteTotal += 1;
            if (!node.isIgnored) {
              stats[currentPath].total += 1;
              if (node.isSelected) {
                stats[currentPath].selected += 1;
              }
            }
          }
        }
      }
    }

    return stats;
  }, [nodes]);

  const visibleNodes = useMemo(() => {
    const filteredNodes = localFilters.showIgnored ? nodes : nodes.filter(n => !n.isIgnored);

    if (!searchTerm.trim()) {
      const visible = [];
      const hiddenPaths = new Set<string>();

      for (const node of filteredNodes) {
        if (node.parentId && hiddenPaths.has(node.parentId)) {
          hiddenPaths.add(node.id);
          continue;
        }
        visible.push(node);
        if (node.isDirectory && !node.isExpanded) {
          hiddenPaths.add(node.id);
        }
      }
      return visible;
    }

    const lowerSearch = searchTerm.toLowerCase();
    const matchedNodes = new Set<string>();

    for (const node of filteredNodes) {
      if (node.name.toLowerCase().includes(lowerSearch)) {
        matchedNodes.add(node.id);
        let currentParent = node.parentId;
        while (currentParent) {
          matchedNodes.add(currentParent);
          const parentNode = filteredNodes.find(n => n.id === currentParent);
          currentParent = parentNode ? parentNode.parentId : null;
        }
      }
    }

    return filteredNodes.filter(node => matchedNodes.has(node.id));
  }, [nodes, searchTerm, localFilters.showIgnored]);

  return (
    <section className="panel-left" style={{ position: 'relative' }}>
      
      <div className="browser-top-bar">
        <a href="/" className="brand-link">
          <img src="/logo.png" alt="make1txt logo" className="brand-logo" />
          <span>make1txt</span>
        </a>
        
        <div className="browser-tabs">
          <button
            className={`browser-tab ${activeTab === 'tree' ? 'active' : ''}`}
            onClick={() => setActiveTab('tree')}
          >
            <IconListTree size={18} /> {t('browser.tabStructure')}
          </button>
          <button
            className={`browser-tab ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
            disabled={!generatedText}
          >
            <IconCode size={18} /> {t('browser.tabResult')}
          </button>
        </div>
        
        <div className="browser-top-spacer"></div>
      </div>

      {isLoading && (
        <div className="browser-loading-overlay">
          <IconLoader2 size={48} className="spin" color="var(--accent-primary)" />
          <h3>{t('browser.scanning')}</h3>
          <p>{t('browser.processedFiles').replace('{{count}}', scannedFilesCount.toString())}</p>
          <Button variant="danger" onClick={cancelDirectoryLoad} style={{ marginTop: 'var(--spacing-md)' }}>
            <IconSquareRoundedX size={18} /> {t('common.cancel')}
          </Button>
        </div>
      )}

      {activeTab === 'tree' ? (
        <>
          <header className="panel-header" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="browser-title">
                <IconFiles size={24} className="browser-title-icon" /> 
                {t('browser.files')}
              </h2>
              
              {nodes.length > 0 && (
                <div className="browser-header-tools">
                  <Button variant="secondary" onClick={toggleSearch} data-tooltip={t('common.search')} data-tooltip-pos="bottom">
                    <IconSearch size={18} color={isSearchVisible ? 'var(--accent-primary)' : 'var(--text-primary)'} />
                  </Button>
                  <Button variant="secondary" onClick={selectAll} data-tooltip={t('browser.selectAll')} data-tooltip-pos="bottom">
                    <IconChecks size={18} />
                  </Button>
                  <Button variant="secondary" onClick={deselectAll} data-tooltip={t('browser.resetSelection')} data-tooltip-pos="bottom">
                    <IconSquareX size={18} />
                  </Button>
                  <Button variant="secondary" onClick={handleSelectFolder} disabled={isLoading} data-tooltip={t('browser.changeFolder')} data-tooltip-pos="bottom">
                    {isLoading ? <IconLoader2 className="spin" size={18} /> : <IconFolderOpen size={18} />}
                  </Button>
                </div>
              )}
            </div>
            
            <div className={`search-container-slide ${isSearchVisible && nodes.length > 0 ? 'visible' : ''}`}>
              <div className="search-input-wrapper">
                <IconSearch size={16} className="search-input-icon" color="var(--text-primary)" />
                <input 
                  className="search-input" 
                  placeholder={t('browser.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </header>
          
          <main className="panel-content" style={{ padding: 0 }}>
            {nodes.length === 0 && !isLoading && (
              <div className="empty-state">
                <IconFolderOpen size={64} stroke={1} color="var(--accent-primary)" />
                <h3>{t('browser.emptyStructureTitle')}</h3>
                <p>{t('browser.emptyStructureDesc')}</p>
                <Button variant="primary" onClick={handleSelectFolder} disabled={isLoading}>
                  {isLoading ? <IconLoader2 className="spin" size={18} /> : <IconFolderOpen size={18} />}
                  {t('browser.selectFolder')}
                </Button>
              </div>
            )}

            {nodes.length > 0 && visibleNodes.length === 0 && !isLoading && (
              <div className="empty-state">
                <IconFileOff size={48} stroke={1.5} />
                <p>{t('browser.notFound')}</p>
              </div>
            )}
            
            {visibleNodes.length > 0 && (
              <VirtualList
                items={visibleNodes}
                itemHeight={24}
                renderItem={(node) => (
                  <FileTreeNode
                    key={node.id}
                    node={node}
                    folderStat={node.isDirectory ? folderStats[node.relativePath] : undefined}
                    onToggleExpand={toggleExpand}
                    onToggleSelect={toggleSelection}
                    onContextMenu={handleContextMenu}
                  />
                )}
              />
            )}
          </main>

          {previewNode && (
            <div className={`preview-panel-container ${isResizingPreview ? 'is-resizing' : ''}`} style={{ height: previewHeight }}>
              <div className="horizontal-resizer" onMouseDown={handlePreviewResizeStart} />
              <FilePreview node={previewNode} onClose={() => setPreviewNode(null)} />
            </div>
          )}
        </>
      ) : (
        <ResultViewer />
      )}

      {contextMenu.isOpen && contextMenu.node && (
        <FileContextMenu 
          key={contextMenu.node.id}
          x={contextMenu.x} 
          y={contextMenu.y} 
          node={contextMenu.node} 
          folderStat={contextMenu.node.isDirectory ? folderStats[contextMenu.node.relativePath] : undefined}
          onClose={closeContextMenu} 
        />
      )}
    </section>
  );
}