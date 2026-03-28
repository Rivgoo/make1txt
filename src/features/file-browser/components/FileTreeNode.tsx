import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconChevronRight, IconChevronDown, IconFolder, IconFolderOpen, 
  IconFileText, IconInfoCircle, IconEye, IconMapPin, IconMapPinOff 
} from '@tabler/icons-react';
import type { FileNode } from '@/core/types/file.types';
import type { FolderStat } from '@/store/useFileStore';
import { useFileStore } from '@/store/useFileStore';
import { formatFileSize, estimateTokenCount } from '@/core/utils/stats.utils';
import { useToast } from '@/shared/context/useToast';
import './FileTreeNode.css';

interface FileTreeNodeProps {
  node: FileNode;
  folderStat?: FolderStat;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

export function FileTreeNode({ node, folderStat, onToggleExpand, onToggleSelect, onContextMenu }: FileTreeNodeProps) {
  const { t } = useTranslation();
  const { localFilters, setPreviewNode, toggleLocalPathIgnore } = useFileStore();
  const { showToast } = useToast();
  const paddingLeft = node.depth * 16 + 8;
  const checkboxRef = useRef<HTMLInputElement>(null);

  const isEffectivelyEmpty = node.isDirectory && folderStat && folderStat.total === 0;
  const isMixed = node.isDirectory && folderStat ? folderStat.selected > 0 && folderStat.selected < folderStat.total : false;
  const isChecked = node.isDirectory && folderStat && folderStat.total > 0 ? folderStat.selected === folderStat.total : node.isSelected;
  
  const isDisabled = node.isIgnored || isEffectivelyEmpty;
  const isIgnoredVisually = node.isIgnored || isEffectivelyEmpty;

  const isUnselected = node.isDirectory 
    ? (folderStat && folderStat.total > 0 && folderStat.selected === 0)
    : !node.isSelected;

  const localPatternCheck = node.relativePath;
  const isLocallyIgnored = localFilters.customPatterns.some(p => p.pattern === localPatternCheck && p.isActive);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isMixed;
    }
  }, [isMixed]);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDirectory) onToggleExpand(node.id);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    let nextState = e.target.checked;
    if (isMixed) {
      nextState = true;
    }
    onToggleSelect(node.id, nextState);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, node);
  };

  const handleToggleLocalIgnore = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLocalPathIgnore(node.relativePath);
    
    if (isLocallyIgnored) {
      showToast('info', t('browser.localFilters'), t('quickSettings.ruleRemoved').replace('{{pattern}}', localPatternCheck));
    } else {
      showToast('warning', t('browser.localFilters'), t('quickSettings.ruleAdded').replace('{{pattern}}', localPatternCheck));
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewNode(node);
  };

  let iconColor = "inherit";
  if (node.isDirectory && !node.isIgnored && !isDisabled && !isUnselected) {
    if (isMixed) {
      iconColor = "var(--warning)";
    } else if (isChecked && node.isExpanded) {
      iconColor = "var(--accent-primary)";
    }
  }

  let metaContent: React.ReactNode = formatFileSize(node.sizeBytes);
  if (node.isDirectory && folderStat) {
    if (folderStat.absoluteTotal === 0) {
      metaContent = t('browser.emptyFolder');
    } else if (folderStat.total === 0) {
      metaContent = `0 / ${folderStat.absoluteTotal}`;
    } else if (folderStat.selected === folderStat.total) {
      metaContent = `${folderStat.total}`;
    } else if (folderStat.selected === 0) {
      metaContent = `0 / ${folderStat.total}`;
    } else {
      metaContent = (
        <>
          <span className="tree-node-meta-mixed">{folderStat.selected}</span>
          <span> / {folderStat.total}</span>
        </>
      );
    }
  }

  const totalBytes = node.isDirectory ? (folderStat?.sizeBytes || 0) : node.sizeBytes;
  const selectedBytes = node.isDirectory 
    ? (folderStat?.selectedSizeBytes || 0) 
    : (node.isSelected && !node.isIgnored ? node.sizeBytes : 0);

  const totalTokens = estimateTokenCount(totalBytes);
  const selectedTokens = estimateTokenCount(selectedBytes);

  const isFullySelected = totalBytes === selectedBytes;
  const nodeClass = `tree-node ${isIgnoredVisually ? 'tree-node--ignored' : ''} ${isUnselected && !isIgnoredVisually ? 'tree-node--unselected' : ''}`;

  return (
    <div 
      className={nodeClass} 
      style={{ paddingLeft }}
      onClick={handleExpandClick}
      onContextMenu={handleRightClick}
    >
      <div className="tree-node-icon tree-node-icon--expander">
        {node.isDirectory && (
          node.isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />
        )}
      </div>

      <input
        ref={checkboxRef}
        type="checkbox"
        className="tree-node-checkbox"
        checked={isChecked}
        onChange={handleCheckboxChange}
        disabled={isDisabled}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="tree-node-icon" style={{ color: iconColor }}>
        {node.isDirectory ? (
          node.isExpanded ? <IconFolderOpen size={16} /> : <IconFolder size={16} />
        ) : (
          <IconFileText size={16} />
        )}
      </div>

      <span className={`tree-node-name ${node.isDirectory ? 'tree-node-name--folder' : 'tree-node-name--file'}`}>
        {node.name}
      </span>

      <span className="tree-node-meta">
        {metaContent}
      </span>

      <div className="tree-node-actions">
        <button 
          className="tree-node-action-btn" 
          data-tooltip={t('common.info')}
          data-tooltip-pos="top"
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
        >
          <IconInfoCircle size={14} />
        </button>
        
        {!node.isDirectory && (
          <button 
            className="tree-node-action-btn" 
            data-tooltip={t('browser.viewContent')}
            data-tooltip-pos="top"
            onClick={handlePreview}
          >
            <IconEye size={14} />
          </button>
        )}
        
        <div className="tree-node-actions-divider" />
        
        <button 
          className={`tree-node-action-btn ${isLocallyIgnored ? 'active-ignore' : ''}`} 
          data-tooltip={isLocallyIgnored ? (node.isDirectory ? t('browser.unignoreFolder') : t('browser.unignoreFile')) : (node.isDirectory ? t('browser.ignoreFolder') : t('browser.ignoreFile'))}
          data-tooltip-pos="top"
          onClick={handleToggleLocalIgnore}
        >
          {isLocallyIgnored ? <IconMapPinOff size={14} /> : <IconMapPin size={14} />}
        </button>
      </div>

      <div className="tree-node-leader" />

      <div 
        className="tree-node-tokens" 
        data-tooltip={t('stats.tokens')}
        data-tooltip-pos="top"
      >
        {isFullySelected ? (
          <span className="tree-node-tokens-selected">~{totalTokens.toLocaleString()}</span>
        ) : (
          <>
            <span className="tree-node-tokens-selected">~{selectedTokens.toLocaleString()}</span>
            <span className="tree-node-tokens-total">/ ~{totalTokens.toLocaleString()}</span>
          </>
        )}
      </div>
    </div>
  );
}