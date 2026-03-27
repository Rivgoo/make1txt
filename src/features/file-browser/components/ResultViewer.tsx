import { useState, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileStore } from '@/store/useFileStore';
import { Button } from '@/shared/ui/Button/Button';
import { IconCopy, IconDownload, IconAlertTriangle, IconEye } from '@tabler/icons-react';
import { useToast } from '@/shared/context/useToast';
import { formatFileSize } from '@/core/utils/stats.utils';
import './ResultViewer.css';

const MAX_PREVIEW_CHARS = 1_000_000;
const TRIGGER_TRUNCATE_CHARS = 1_500_000;

function copyViaTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyTextReliably(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to legacy path
    }
  }

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return;
    } catch {
      // Fall through to legacy path
    }
  }

  const success = copyViaTextarea(text);
  if (!success) throw new Error('execCommand copy failed');
}

export function ResultViewer() {
  const { t } = useTranslation();
  const { generatedText } = useFileStore();
  const { showToast } = useToast();
  const [showFull, setShowFull] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOversized = (generatedText?.length ?? 0) > TRIGGER_TRUNCATE_CHARS;

  const displayText = useMemo(() => {
    if (!generatedText) return '';
    if (isOversized && !showFull) {
      return generatedText.slice(0, MAX_PREVIEW_CHARS) + t('result.truncatedMark');
    }
    return generatedText;
  }, [generatedText, isOversized, showFull, t]);

  const handleCopy = useCallback(async () => {
    if (!generatedText || isCopying) return;
    setIsCopying(true);
    try {
      const sanitizedText = generatedText.replace(/\0/g, '');
      await copyTextReliably(sanitizedText);
      showToast('success', t('common.copied'), t('generator.copySuccess'));
    } catch {
      textareaRef.current?.select();
      showToast('error', t('common.error'), t('generator.copyError'));
    } finally {
      setIsCopying(false);
    }
  }, [generatedText, isCopying, showToast, t]);

  const handleDownload = useCallback(() => {
    if (!generatedText) return;
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codebase_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedText]);

  const sizeEstimate = formatFileSize(generatedText?.length ?? 0);

  return (
    <div className="result-wrapper">
      <header className="panel-header result-header" style={{ gap: 'var(--spacing-sm)' }}>
        <Button variant="secondary" onClick={handleCopy} disabled={isCopying}>
          <IconCopy size={18} /> {isCopying ? t('common.wait') : t('common.copy')}
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          <IconDownload size={18} /> {t('common.downloadTxt')}
        </Button>
      </header>

      <main className="panel-content result-content">
        <textarea
          ref={textareaRef}
          className="result-textarea"
          readOnly
          value={displayText}
        />
        
        {isOversized && !showFull && (
          <div className="result-warning-banner">
            <h3>
              <IconAlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {t('result.largeWarningTitle')}
            </h3>
            <p>{t('result.largeWarningDesc').replace('{{size}}', sizeEstimate)}</p>
            <div className="result-warning-actions">
              <Button variant="secondary" onClick={() => setShowFull(true)}>
                <IconEye size={18} /> {t('result.showAll')}
              </Button>
              <Button variant="secondary" onClick={handleCopy} disabled={isCopying}>
                <IconCopy size={18} /> {isCopying ? t('common.wait') : t('common.copy')}
              </Button>
              <Button variant="primary" onClick={handleDownload}>
                <IconDownload size={18} /> {t('common.downloadTxt')}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}