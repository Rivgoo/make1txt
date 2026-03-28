import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronRight, IconChevronDown, IconFolder, IconFolderOpen, IconFileText } from '@tabler/icons-react';
import type { FileNode } from '@/core/types/file.types';
import type { FolderStat } from '@/store/useFileStore';
import { formatFileSize, estimateTokenCount } from '@/core/utils/stats.utils';
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
  const paddingLeft = node.depth * 16 + 8;
  const checkboxRef = useRef<HTMLInputElement>(null);

  const isEffectivelyEmpty = node.isDirectory && folderStat && folderStat.total === 0;
  const isMixed = node.isDirectory && folderStat ? folderStat.selected > 0 && folderStat.selected < folderStat.total : false;
  const isChecked = node.isDirectory && folderStat && folderStat.total > 0 ? folderStat.selected === folderStat.total : node.isSelected;
  
  const isDisabled = node.isIgnored || isEffectivelyEmpty;

  const isUnselected = node.isDirectory 
    ? (folderStat && folderStat.total > 0 && folderStat.selected === 0)
    : !node.isSelected;

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

  const byteSize = node.isDirectory ? (folderStat?.sizeBytes || 0) : node.sizeBytes;
  const tokensCount = estimateTokenCount(byteSize);

  const isIgnoredVisually = node.isIgnored || isEffectivelyEmpty;
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

      <div className="tree-node-leader" />

      <span className="tree-node-tokens" title={t('stats.tokens')}>
        ~{tokensCount.toLocaleString()}
      </span>
    </div>
  );
}