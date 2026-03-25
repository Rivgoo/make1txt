// src/features/file-browser/components/ResultViewer.tsx
import { useFileStore } from '@/store/useFileStore';
import { Button } from '@/shared/ui/Button/Button';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import { useToast } from '@/shared/context/useToast';
import './ResultViewer.css';

export function ResultViewer() {
  const { generatedText } = useFileStore();
  const { showToast } = useToast();

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      showToast('success', 'Скопійовано', 'Текст успішно додано в буфер обміну.');
    } catch {
      showToast('error', 'Помилка', 'Не вдалося скопіювати текст.');
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
          <IconCopy size={18} /> Скопіювати
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          <IconDownload size={18} /> Завантажити .txt
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