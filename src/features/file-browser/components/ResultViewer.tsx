import { useTranslation } from 'react-i18next';
import { useFileStore } from '@/store/useFileStore';
import { Button } from '@/shared/ui/Button/Button';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { useToast } from '@/shared/context/useToast';
import './ResultViewer.css';

export function ResultViewer() {
  const { t } = useTranslation();
  const { generatedText } = useFileStore();
  const { showToast } = useToast();

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      showToast('success', t('common.copied'), t('generator.copySuccess'));
    } catch {
      showToast('error', t('common.error'), t('generator.copyError'));
    }
  };

  const handleDownload = () => {
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
  };

  return (
    <>
      <header className="panel-header" style={{ justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
        <Button variant="secondary" onClick={handleCopy}>
          <IconCopy size={18} /> {t('common.copy')}
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          <IconDownload size={18} /> {t('common.downloadTxt')}
        </Button>
      </header>
      <main className="panel-content result-content" style={{ padding: 0, display: 'flex' }}>
        <textarea
          className="result-textarea"
          readOnly
          value={generatedText || ''}
        />
      </main>
    </>
  );
}