import { useState, useMemo } from 'react';
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
      showToast('success', 'Збережено', 'Профіль успішно збережено.');
    } catch {
      showToast('error', 'Помилка', 'Не вдалося зберегти профіль.');
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
      showToast('success', 'Видалено', 'Профіль успішно видалено.');
    } catch {
      showToast('error', 'Помилка', 'Не вдалося видалити профіль.');
    }
  };

  const handleLoad = async (profile: Profile) => {
    if (isLoading) {
      showToast('warning', 'Зайнято', 'Процес завантаження вже триває.');
      return;
    }
    
    onClose();

    try {
      await loadProfile(profile);
      if (profile.directoryHandle) {
        showToast('success', 'Профіль завантажено', 'Директорію та налаштування успішно відновлено.');
      } else {
        showToast('info', 'Налаштування застосовано', 'Профіль застосовано без прив\'язки до папки.');
      }
    } catch (error) {
      if (error instanceof Error) showToast('warning', 'Увага', error.message);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('uk-UA', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).format(new Date(timestamp));
  };

  return (
    <Modal isOpen={isOpen} title="Менеджер профілів" maxWidth="600px" onClose={onClose}>
      <div className="pm-creator">
        <h4 className="pm-section-title">Створити новий профіль</h4>
        <div className="pm-creator-row">
          <input 
            className="pm-input" 
            placeholder="Введіть назву профілю..." 
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            disabled={isLoading}
          />
          <Button onClick={handleSave} disabled={!newProfileName.trim() || isLoading}>
            <IconDeviceFloppy size={18} /> Зберегти
          </Button>
        </div>
        <label className="pm-checkbox-label">
          <input 
            type="checkbox" 
            checked={saveDirectory}
            onChange={(e) => setSaveDirectory(e.target.checked)}
            disabled={isLoading}
          />
          Зберегти прив'язку до вибраної папки
        </label>
      </div>

      <div className="pm-list-section">
        <div className="pm-list-header">
          <h4 className="pm-section-title">Збережені профілі</h4>
          {profiles.length > 0 && (
            <div className="pm-search-wrapper">
              <IconSearch size={16} className="pm-search-icon" />
              <input 
                className="pm-search-input" 
                placeholder="Пошук..." 
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          )}
        </div>

        <div className="pm-list">
          {profiles.length === 0 ? (
            <div className="pm-empty">Немає збережених профілів. Налаштуйте фільтри та збережіть їх для швидкого доступу.</div>
          ) : currentProfiles.length === 0 ? (
            <div className="pm-empty">Профілів за запитом "{searchQuery}" не знайдено.</div>
          ) : (
            currentProfiles.map(p => (
              <div key={p.id} className={`pm-item ${confirmDeleteId === p.id ? 'pm-item--delete' : ''}`}>
                {confirmDeleteId === p.id ? (
                  <div className="pm-confirm-delete">
                    <IconAlertTriangle size={20} color="var(--danger)" />
                    <span>Ви дійсно бажаєте видалити <strong>{p.name}</strong>?</span>
                    <div className="pm-confirm-actions">
                      <Button variant="danger" onClick={() => handleDelete(p.id)}>Так, видалити</Button>
                      <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Скасувати</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pm-item-info">
                      <span className="pm-item-name">{p.name}</span>
                      <div className="pm-item-meta">
                        {p.directoryName ? (
                          <span className="pm-badge" title="Прив'язано до папки"><IconFolder size={12}/> {p.directoryName}</span>
                        ) : (
                          <span className="pm-badge pm-badge--settings" title="Тільки налаштування"><IconFileSettings size={12}/> Налаштування</span>
                        )}
                        <span className="pm-meta-text" title="Останнє використання">
                          <IconClock size={12}/> {formatDate(p.lastUsed)}
                        </span>
                      </div>
                    </div>
                    <div className="pm-item-actions">
                      <Button variant="secondary" onClick={() => handleLoad(p)} disabled={isLoading}>Завантажити</Button>
                      <button className="pm-btn-icon-danger" onClick={() => setConfirmDeleteId(p.id)} title="Видалити" disabled={isLoading}>
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