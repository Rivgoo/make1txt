import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconX, IconFileText, IconLoader2, IconWand, IconAlertTriangle } from '@tabler/icons-react';
import type { FileNode } from '@/core/types/file.types';
import { formatFileSize, estimateTokenCount } from '@/core/utils/stats.utils';
import { optimizeText } from '@/core/utils/optimization.utils';
import { useFileStore } from '@/store/useFileStore';
import './FilePreview.css';

const MAX_PREVIEW_SIZE = 1024 * 1024;

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
  const { localFilters } = useFileStore();
  const [originalText, setOriginalText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTruncated, setIsTruncated] = useState(false);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'optimized'>('original');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsTruncated(false);
    setViewMode('original');

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
        
        if (file.size > MAX_PREVIEW_SIZE) {
          const slice = file.slice(0, MAX_PREVIEW_SIZE);
          const text = await slice.text();
          if (isMounted) {
            setOriginalText(text + t('result.truncatedMark'));
            setIsTruncated(true);
          }
        } else {
          const text = await file.text();
          if (isMounted) setOriginalText(text || '(Empty)');
        }
      } catch {
        if (isMounted) setOriginalText(t('browser.notAvailable'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadContent();
    return () => { isMounted = false; };
  }, [node, t]);

  const optResult = useMemo(() => {
    if (!localFilters?.isOptimizationEnabled || !originalText) return null;
    return optimizeText(originalText, localFilters.optimizationRules || [], true);
  }, [originalText, localFilters?.isOptimizationEnabled, localFilters?.optimizationRules]);

  const isOptimizedAvailable = optResult && optResult.optimizedBytes < optResult.originalBytes;
  const activeSize = viewMode === 'optimized' && optResult ? optResult.optimizedBytes : meta?.size || 0;

  return (
    <>
      <div className="preview-header">
        <div className="preview-header-main">
          <div className="preview-title">
            <IconFileText size={16} color="var(--accent-primary)" />
            <span>{node.name}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            {localFilters?.isOptimizationEnabled && isOptimizedAvailable && (
              <div className="preview-tabs">
                <button 
                  className={`preview-tab ${viewMode === 'original' ? 'active' : ''}`}
                  onClick={() => setViewMode('original')}
                >
                  {t('preview.original', 'Original')}
                </button>
                <button 
                  className={`preview-tab ${viewMode === 'optimized' ? 'active success' : ''}`}
                  onClick={() => setViewMode('optimized')}
                >
                  <IconWand size={14} /> 
                  {t('preview.optimized', 'Optimized')} 
                  <span style={{ opacity: 0.8 }}>(-{formatFileSize(optResult.originalBytes - optResult.optimizedBytes)})</span>
                </button>
              </div>
            )}

            <button className="context-menu-close-btn" onClick={onClose}>
              <IconX size={16} />
            </button>
          </div>
        </div>

        {meta && (
          <div className="preview-meta-bar">
            <span>
              {t('browser.path')}: <strong>{node.relativePath}</strong>
            </span>
            <span>
              {t('browser.size')}: <strong style={{ color: viewMode === 'optimized' ? 'var(--success)' : 'inherit' }}>{formatFileSize(activeSize)}</strong>
            </span>
            <span>
              {t('stats.tokens')}: <strong style={{ color: viewMode === 'optimized' ? 'var(--success)' : 'inherit' }}>~{estimateTokenCount(activeSize).toLocaleString()}</strong>
            </span>
            <span>
              {t('browser.modified')}: <strong>{meta.modified}</strong>
            </span>
          </div>
        )}

        {isTruncated && (
          <div className="preview-truncate-warning">
            <IconAlertTriangle size={14} />
            {t('result.largeWarningTitle')}
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
          viewMode === 'optimized' && optResult ? (
            <div dangerouslySetInnerHTML={{ __html: optResult.optimizedText }} />
          ) : (
            originalText
          )
        )}
      </div>
    </>
  );
}