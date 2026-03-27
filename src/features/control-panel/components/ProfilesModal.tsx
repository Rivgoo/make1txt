import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconTrash, IconDeviceFloppy, IconSearch, IconClock, 
  IconFolder, IconFileSettings, IconChevronLeft, IconChevronRight, IconAlertTriangle 
} from '@tabler/icons-react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Button } from '@/shared/ui/Button/Button';
import type { Profile } from '@/core/types/file.types';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';
import './ProfilesModal.css';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 5;

export function ProfilesModal({ isOpen, onClose }: ProfilesModalProps) {
  const { t } = useTranslation();
  const [newProfileName, setNewProfileName] = useState('');
  const [saveDirectory, setSaveDirectory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { profiles, saveCurrentProfile, deleteProfile, loadProfile, isLoading } = useFileStore();
  const { showToast } = useToast();

  const filteredProfiles = useMemo(() => {
    return profiles
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.lastUsed - a.lastUsed);
  }, [profiles, searchQuery]);

  const totalPages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE);
  const currentProfiles = filteredProfiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSave = async () => {
    if (!newProfileName.trim() || isLoading) return;
    try {
      await saveCurrentProfile(newProfileName.trim(), saveDirectory);
      setNewProfileName('');
      setSearchQuery('');
      setCurrentPage(1);
      showToast('success', t('common.success'), t('profiles.savedSuccess'));
    } catch {
      showToast('error', t('common.error'), t('profiles.saveError'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
      setConfirmDeleteId(null);
      const newTotalPages = Math.ceil((filteredProfiles.length - 1) / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
      showToast('success', t('common.success'), t('profiles.deletedSuccess'));
    } catch {
      showToast('error', t('common.error'), t('profiles.deleteError'));
    }
  };

  const handleLoad = async (profile: Profile) => {
    if (isLoading) {
      showToast('warning', t('common.wait'), t('browser.alreadyLoading'));
      return;
    }
    
    onClose();

    try {
      await loadProfile(profile);
      if (profile.directoryHandle) {
        showToast('success', t('common.success'), t('profiles.loadedWithDir'));
      } else {
        showToast('info', t('common.info'), t('profiles.loadedSettingsOnly'));
      }
    } catch (error) {
      if (error instanceof Error) showToast('warning', t('common.warning'), error.message);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat(t('settings.langUk') ? 'uk-UA' : 'en-US', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).format(new Date(timestamp));
  };

  return (
    <Modal isOpen={isOpen} title={t('profiles.title')} maxWidth="600px" onClose={onClose}>
      <div className="pm-creator">
        <h4 className="pm-section-title">{t('profiles.createTitle')}</h4>
        <div className="pm-creator-row">
          <input 
            className="pm-input" 
            placeholder={t('profiles.namePlaceholder')} 
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            disabled={isLoading}
          />
          <Button onClick={handleSave} disabled={!newProfileName.trim() || isLoading}>
            <IconDeviceFloppy size={18} /> {t('common.save')}
          </Button>
        </div>
        <label className="pm-checkbox-label">
          <input 
            type="checkbox" 
            checked={saveDirectory}
            onChange={(e) => setSaveDirectory(e.target.checked)}
            disabled={isLoading}
          />
          {t('profiles.saveWithDir')}
        </label>
      </div>

      <div className="pm-list-section">
        <div className="pm-list-header">
          <h4 className="pm-section-title">{t('profiles.savedList')}</h4>
          {profiles.length > 0 && (
            <div className="pm-search-wrapper">
              <IconSearch size={16} className="pm-search-icon" />
              <input 
                className="pm-search-input" 
                placeholder={t('common.search')} 
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          )}
        </div>

        <div className="pm-list">
          {profiles.length === 0 ? (
            <div className="pm-empty">{t('profiles.emptyList')}</div>
          ) : currentProfiles.length === 0 ? (
            <div className="pm-empty">{t('profiles.emptySearch').replace('{{query}}', searchQuery)}</div>
          ) : (
            currentProfiles.map(p => (
              <div key={p.id} className={`pm-item ${confirmDeleteId === p.id ? 'pm-item--delete' : ''}`}>
                {confirmDeleteId === p.id ? (
                  <div className="pm-confirm-delete">
                    <IconAlertTriangle size={20} color="var(--danger)" />
                    <span>{t('profiles.deleteConfirmText')} <strong>{p.name}</strong>?</span>
                    <div className="pm-confirm-actions">
                      <Button variant="danger" onClick={() => handleDelete(p.id)}>{t('common.yesDelete')}</Button>
                      <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pm-item-info">
                      <span className="pm-item-name">{p.name}</span>
                      <div className="pm-item-meta">
                        {p.directoryName ? (
                          <span className="pm-badge" title={t('profiles.boundToDir')}><IconFolder size={12}/> {p.directoryName}</span>
                        ) : (
                          <span className="pm-badge pm-badge--settings" title={t('profiles.settingsOnly')}><IconFileSettings size={12}/> {t('profiles.settingsOnly')}</span>
                        )}
                        <span className="pm-meta-text">
                          <IconClock size={12}/> {formatDate(p.lastUsed)}
                        </span>
                      </div>
                    </div>
                    <div className="pm-item-actions">
                      <Button variant="secondary" onClick={() => handleLoad(p)} disabled={isLoading}>{t('profiles.load')}</Button>
                      <button className="pm-btn-icon-danger" onClick={() => setConfirmDeleteId(p.id)} disabled={isLoading}>
                        <IconTrash size={18}/>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pm-pagination">
            <button 
              className="pm-page-btn" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <IconChevronLeft size={16} />
            </button>
            <span className="pm-page-info">{currentPage} / {totalPages}</span>
            <button 
              className="pm-page-btn" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}