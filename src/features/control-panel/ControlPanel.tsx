import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconDeviceFloppy, IconSquareX, IconSettings, 
  IconChevronDown, IconChevronRight, IconFiles, 
  IconWeight, IconLetterCase, IconCpu, IconSparkles,
  IconAdjustments, IconWand, IconFolderOpen
} from '@tabler/icons-react';
import { Button } from '@/shared/ui/Button/Button';
import { useFileStore } from '@/store/useFileStore';
import { formatFileSize, hasMeaningfulOptimization } from '@/core/utils/stats.utils';
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
  const { fetchProfiles, getStats, isLoading, isTokenizing, tokenizationProgress, localFilters, nodes, loadDirectory } = useFileStore();
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

  const handleSelectFolder = async () => {
    try {
      await loadDirectory();
      showToast('success', t('common.success'), t('browser.folderLoaded'));
    } catch (error) {
      if (error instanceof Error && error.message !== 'CANCELLED') {
        showToast('error', t('common.error'), error.message);
      }
    }
  };

  const hasSavings = localFilters?.isOptimizationEnabled && hasMeaningfulOptimization(stats.totalSizeBytes, stats.totalOptimizedBytes);
  const savedTokens = stats.baseTokens - stats.tokens;

  if (nodes.length === 0 && !isLoading) {
    return (
      <aside className="panel-right">
        <div className="cp-empty-state">
           <IconAdjustments size={48} color="var(--text-muted)" stroke={1.5} />
           <div className="cp-empty-text">
             <h3>{t('panel.emptyStateTitle')}</h3>
             <p>{t('panel.emptyStateDesc')}</p>
           </div>
           <div className="cp-empty-actions">
             <Button variant="primary" onClick={handleSelectFolder} isFullWidth>
               <IconFolderOpen size={20} /> {t('browser.selectFolder')}
             </Button>
             <Button variant="secondary" onClick={() => setIsAdvancedOpen(true)} isFullWidth>
               <IconSettings size={20} /> {t('panel.settings')}
             </Button>
             <Button variant="secondary" onClick={handleOpenProfiles} isFullWidth>
               <IconDeviceFloppy size={20} /> {t('panel.profiles')}
             </Button>
           </div>
        </div>
        <ProfilesModal isOpen={isProfilesOpen} onClose={() => setIsProfilesOpen(false)} />
        <AdvancedSettingsModal isOpen={isAdvancedOpen} onClose={() => setIsAdvancedOpen(false)} />
      </aside>
    );
  }

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
              
              {hasSavings && (
                <div className="stat-box">
                  <span className="stat-label"><IconWand size={14}/> {t('optimization.saved')}</span>
                  <span className="stat-value success">
                    -{formatFileSize(stats.totalSizeBytes - stats.totalOptimizedBytes)}
                  </span>
                </div>
              )}
              
              <div className="stat-box">
                <span className="stat-label"><IconLetterCase size={14}/> {t('stats.words')}</span>
                <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
              </div>

              {hasSavings ? (
                <>
                  <div className="stat-box">
                    <span className="stat-label" data-tooltip={stats.isExactTokens ? t('stats.exact') : t('stats.estimated')} data-tooltip-pos="top">
                      <IconCpu size={14}/> {t('stats.tokens')} {isTokenizing && `(${tokenizationProgress}%)`}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="stat-value accent">
                        {!stats.isExactTokens && '~'}{stats.tokens.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {!stats.isExactTokens && '~'}{stats.baseTokens.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label"><IconWand size={14}/> {t('optimization.tokensSaved')}</span>
                    <span className="stat-value success">
                      -{savedTokens.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="stat-box">
                  <span className="stat-label" data-tooltip={stats.isExactTokens ? t('stats.exact') : t('stats.estimated')} data-tooltip-pos="top">
                    <IconCpu size={14}/> {t('stats.tokens')} {isTokenizing && `(${tokenizationProgress}%)`}
                  </span>
                  <span className="stat-value accent">
                    {!stats.isExactTokens && '~'}{stats.baseTokens.toLocaleString()}
                  </span>
                </div>
              )}

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