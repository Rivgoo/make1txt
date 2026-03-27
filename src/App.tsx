import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconDeviceDesktop } from '@tabler/icons-react';
import { FileBrowser } from '@/features/file-browser/FileBrowser';
import { ControlPanel } from '@/features/control-panel/ControlPanel';
import { useFileStore } from '@/store/useFileStore';
import '@/features/layout/Layout.css';

export default function App() {
  const [leftWidth, setLeftWidth] = useState(() => {
    const cached = localStorage.getItem('splitterWidth');
    return cached ? Number(cached) : 60;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const { t, i18n } = useTranslation();
  const language = useFileStore((s) => s.globalSettings.language);

  useEffect(() => {
    if (language === 'auto') {
      const browserLang = navigator.language.toLowerCase();
      i18n.changeLanguage(browserLang.startsWith('uk') || browserLang.startsWith('ru') ? 'uk' : 'en');
    } else {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newWidth = (e.clientX / window.innerWidth) * 100;
      
      // Calculate dynamic min/max based on 300px min width for each side
      // This ensures panels don't break on tablet screens when dragged.
      const minPct = Math.max(10, (300 / window.innerWidth) * 100);
      const maxPct = Math.min(90, 100 - (300 / window.innerWidth) * 100);
      
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