// src/features/control-panel/ControlPanel.tsx
import { useState } from 'react';
import { 
  IconDeviceFloppy, IconSquareX, IconSettings, 
  IconChevronDown, IconChevronRight, IconFiles, 
  IconWeight, IconLetterCase, IconCpu, IconSparkles
} from '@tabler/icons-react';
import { Button } from '@/shared/ui/Button/Button';
import { useFileStore } from '@/store/useFileStore';
import { formatFileSize } from '@/core/utils/stats.utils';
import { useToast } from '@/shared/context/useToast';
import { QuickSettings } from './components/QuickSettings';
import { AdvancedSettingsModal } from './components/AdvancedSettingsModal';
import { ProfilesModal } from './components/ProfilesModal';
import { useGenerator } from './hooks/useGenerator';
import { useHotkey } from './hooks/useHotkey';
import '../layout/Layout.css';
import './ControlPanel.css';
import './components/ProgressBar.css';

export function ControlPanel() {
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [isStatsExpanded, setIsStatsExpanded] = useState(() => {
    const cached = localStorage.getItem('make1txt_statsExpanded');
    return cached !== 'false';
  });

  const { isGenerating, progress, startGeneration, cancelGeneration } = useGenerator();
  const { fetchProfiles, getStats } = useFileStore();
  const { showToast } = useToast();
  const stats = getStats();

  useHotkey('enter', true, () => {
    if (!isGenerating && stats.selectedFiles > 0) {
      startGeneration();
    }
  });

  const toggleStats = () => {
    const newVal = !isStatsExpanded;
    setIsStatsExpanded(newVal);
    localStorage.setItem('make1txt_statsExpanded', newVal.toString());
  };

  const handleOpenProfiles = async () => {
    try {
      await fetchProfiles();
      setIsProfilesOpen(true);
    } catch {
      showToast('error', 'Помилка', 'Не вдалося завантажити профілі з БД.');
    }
  };

  return (
    <aside className="panel-right">
      <header className="panel-header" style={{ gap: 'var(--spacing-xs)' }}>
        <h2 style={{ fontSize: '1.25rem', flex: 1 }}>Налаштування</h2>
        <Button variant="secondary" onClick={() => setIsAdvancedOpen(true)} data-tooltip="Розширені">
          <IconSettings size={18} />
        </Button>
        <Button variant="secondary" onClick={handleOpenProfiles} disabled={isGenerating} data-tooltip="Профілі (Ctrl+P)" data-tooltip-pos="left">
          <IconDeviceFloppy size={18} />
        </Button>
      </header>
      
      <main className="panel-content">
        <QuickSettings />

        <div>
          <div className="stats-header" onClick={toggleStats}>
            <div className="stats-header-title">
              {isStatsExpanded ? <IconChevronDown size={18}/> : <IconChevronRight size={18}/>}
              Статистика файлів
            </div>
          </div>
          
          {isStatsExpanded && (
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label"><IconFiles size={14}/> Вибрано</span>
                <span className="stat-value">{stats.selectedFiles} <small>/ {stats.totalFiles}</small></span>
              </div>
              <div className="stat-box">
                <span className="stat-label"><IconWeight size={14}/> Розмір</span>
                <span className="stat-value">{formatFileSize(stats.totalSizeBytes)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label"><IconLetterCase size={14}/> Слів</span>
                <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label"><IconCpu size={14}/> Токенів</span>
                <span className="stat-value accent">~{stats.estimatedTokens.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="panel-footer">
        {isGenerating ? (
          <div className="progress-container">
            <div className="progress-info">
              <span>Генерація...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <Button variant="danger" isFullWidth onClick={cancelGeneration}>
              <IconSquareX size={18} /> Скасувати
            </Button>
          </div>
        ) : (
          <button 
            className="generate-btn"
            disabled={stats.selectedFiles === 0}
            onClick={startGeneration}
            title="Ctrl+Enter"
          >
            <IconSparkles size={20} />
            Згенерувати результат
          </button>
        )}
      </footer>

      <ProfilesModal isOpen={isProfilesOpen} onClose={() => setIsProfilesOpen(false)} />
      <AdvancedSettingsModal isOpen={isAdvancedOpen} onClose={() => setIsAdvancedOpen(false)} />
    </aside>
  );
}