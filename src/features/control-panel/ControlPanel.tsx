import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconDeviceFloppy, IconSquareX, IconSettings, 
  IconChevronDown, IconChevronRight, IconFiles, 
  IconWeight, IconLetterCase, IconCpu, IconSparkles,
  IconAdjustments
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
  const { t } = useTranslation();
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [isStatsExpanded, setIsStatsExpanded] = useState(() => {
    const cached = localStorage.getItem('make1txt_statsExpanded');
    return cached !== 'false';
  });

  const { isGenerating, progress, startGeneration, cancelGeneration } = useGenerator();
  const { fetchProfiles, getStats, isLoading } = useFileStore();
  const { showToast } = useToast();
  const stats = getStats();

  useHotkey('enter', true, () => {
    if (!isGenerating && stats.selectedFiles > 0 && !isLoading) {
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
      showToast('error', t('common.error'), t('profiles.saveError'));
    }
  };

  return (
    <aside className="panel-right">
      <header className="panel-header" style={{ gap: 'var(--spacing-xs)' }}>
        <h2 style={{ fontSize: '1.25rem', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAdjustments size={24} color="var(--accent-primary)" />
          {t('panel.settings')}
        </h2>
        <Button variant="secondary" onClick={() => setIsAdvancedOpen(true)}>
          <IconSettings size={18} />
        </Button>
        <Button variant="secondary" onClick={handleOpenProfiles} disabled={isGenerating || isLoading}>
          <IconDeviceFloppy size={18} /> {t('panel.profiles')}
        </Button>
      </header>
      
      <main className="panel-content">
        <QuickSettings />

        <div>
          <div className="stats-header" onClick={toggleStats}>
            <div className="stats-header-title">
              {isStatsExpanded ? <IconChevronDown size={18}/> : <IconChevronRight size={18}/>}
              {t('stats.title')}
            </div>
          </div>
          
          {isStatsExpanded && (
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label"><IconFiles size={14}/> {t('stats.selected')}</span>
                <span className="stat-value">{stats.selectedFiles} <small>/ {stats.totalFiles}</small></span>
              </div>
              <div className="stat-box">
                <span className="stat-label"><IconWeight size={14}/> {t('stats.size')}</span>
                <span className="stat-value">{formatFileSize(stats.totalSizeBytes)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label"><IconLetterCase size={14}/> {t('stats.words')}</span>
                <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label"><IconCpu size={14}/> {t('stats.tokens')}</span>
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
              <span>{t('panel.generating')}</span>
              <span>{t('panel.progress').replace('{{percent}}', progress.toString())}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <Button variant="danger" isFullWidth onClick={cancelGeneration}>
              <IconSquareX size={18} /> {t('panel.cancelGeneration')}
            </Button>
          </div>
        ) : (
          <button 
            className="generate-btn"
            disabled={stats.selectedFiles === 0 || isLoading}
            onClick={startGeneration}
            title="Ctrl+Enter"
          >
            <IconSparkles size={20} />
            {t('panel.generateResult')}
          </button>
        )}
      </footer>

      <ProfilesModal isOpen={isProfilesOpen} onClose={() => setIsProfilesOpen(false)} />
      <AdvancedSettingsModal isOpen={isAdvancedOpen} onClose={() => setIsAdvancedOpen(false)} />
    </aside>
  );
}