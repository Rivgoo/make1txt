import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconDeviceDesktop } from '@tabler/icons-react';
import { FileBrowser } from '@/features/file-browser/FileBrowser';
import { ControlPanel } from '@/features/control-panel/ControlPanel';
import { SyncOverlay } from '@/features/sync/SyncOverlay';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import '@/features/layout/Layout.css';

export default function App() {
  const [leftWidth, setLeftWidth] = useState(() => {
    const cached = localStorage.getItem('splitterWidth');
    return cached ? Number(cached) : 60;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const isDraggingRef = useRef(false);

  const { t, i18n } = useTranslation();
  const language = useFileStore((s) => s.globalSettings.language);
  const loadFromIdeSync = useFileStore((s) => s.loadFromIdeSync);
  const { showToast } = useToast();

  useEffect(() => {
    if (language === 'auto') {
      const browserLang = navigator.language.toLowerCase();
      i18n.changeLanguage(browserLang.startsWith('uk') || browserLang.startsWith('ru') ? 'uk' : 'en');
    } else {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const port = searchParams.get('port');
    const token = searchParams.get('token');

    if (port && token) {
      setSyncStatus('loading');
      
      // Очищаємо URL для приватності
      window.history.replaceState({}, document.title, window.location.pathname);

      loadFromIdeSync(port, token)
        .then(() => {
          setSyncStatus('idle');
          showToast('success', t('common.success'), t('sync.successMessage', 'Workspace synced successfully.'));
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }
  }, [loadFromIdeSync, showToast, t]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newWidth = (e.clientX / window.innerWidth) * 100;
      const minPct = Math.max(20, (550 / window.innerWidth) * 100);
      const maxPct = Math.min(80, 100 - (400 / window.innerWidth) * 100);
      
      if (newWidth >= minPct && newWidth <= maxPct) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        localStorage.setItem('splitterWidth', leftWidth.toString());
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, leftWidth]);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  return (
    <>
      <div className="mobile-overlay">
        <IconDeviceDesktop size={64} className="mobile-overlay-icon" stroke={1.5} />
        <h2>{t('mobileWarning.title')}</h2>
        <p>{t('mobileWarning.desc')}</p>
      </div>

      {(syncStatus === 'loading' || syncStatus === 'error') && (
        <SyncOverlay status={syncStatus} onReset={() => setSyncStatus('idle')} />
      )}
      
      <div 
        className={`app-layout ${isDragging ? 'is-dragging' : ''}`}
        style={{ gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%` }}
      >
        <FileBrowser />
        <div className="layout-resizer" onMouseDown={handleMouseDown} />
        <ControlPanel />
      </div>
    </>
  );
}