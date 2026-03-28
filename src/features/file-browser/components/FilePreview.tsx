import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconX, IconFileText, IconLoader2 } from '@tabler/icons-react';
import type { FileNode } from '@/core/types/file.types';
import { formatFileSize, estimateTokenCount } from '@/core/utils/stats.utils';
import './FilePreview.css';

interface FilePreviewProps {
  node: FileNode;
  onClose: () => void;
}

interface MetaInfo {
  size: number;
  modified: string;
  type: string;
}

export function FilePreview({ node, onClose }: FilePreviewProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [meta, setMeta] = useState<MetaInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadContent = async () => {
      try {
        const file = await (node.handle as FileSystemFileHandle).getFile();
        
        if (isMounted) {
          setMeta({
            size: file.size,
            modified: new Date(file.lastModified).toLocaleString(),
            type: file.type || 'unknown'
          });
        }
        
        if (file.size > 5 * 1024 * 1024) {
          if (isMounted) setContent(t('browser.notAvailable'));
        } else {
          const text = await file.text();
          if (isMounted) setContent(text || '(Empty)');
        }
      } catch {
        if (isMounted) setContent(t('browser.notAvailable'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadContent();
    return () => { isMounted = false; };
  }, [node, t]);

  return (
    <>
      <div className="preview-header">
        <div className="preview-header-main">
          <div className="preview-title">
            <IconFileText size={16} color="var(--accent-primary)" />
            <span>{node.name}</span>
          </div>
          <button className="context-menu-close-btn" onClick={onClose}>
            <IconX size={16} />
          </button>
        </div>
        {meta && (
          <div className="preview-meta-bar">
            <span>
              {t('browser.path')}: <strong>{node.relativePath}</strong>
            </span>
            <span>
              {t('browser.size')}: <strong>{formatFileSize(meta.size)}</strong>
            </span>
            <span>
              {t('stats.tokens')}: <strong>~{estimateTokenCount(meta.size).toLocaleString()}</strong>
            </span>
            <span>
              {t('browser.modified')}: <strong>{meta.modified}</strong>
            </span>
          </div>
        )}
      </div>
      <div className="preview-body">
        {isLoading ? (
          <div className="preview-loading">
            <IconLoader2 size={24} className="spin" />
            <span>{t('common.loading')}</span>
          </div>
        ) : (
          content
        )}
      </div>
    </>
  );
}