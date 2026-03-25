// src/features/control-panel/components/ProfilesModal.tsx
import { useState } from 'react';
import { IconTrash, IconDeviceFloppy } from '@tabler/icons-react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Button } from '@/shared/ui/Button/Button';
import type { Profile } from '@/core/types/file.types';
import { useFileStore } from '@/store/useFileStore';
import { useToast } from '@/shared/context/useToast';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilesModal({ isOpen, onClose }: ProfilesModalProps) {
  const [newProfileName, setNewProfileName] = useState('');
  
  const { profiles, saveCurrentProfile, deleteProfile, loadDirectoryFromHandle, applySettings } = useFileStore();
  const { showToast } = useToast();

  const handleSave = async () => {
    if (!newProfileName.trim()) return;
    try {
      await saveCurrentProfile(newProfileName.trim());
      setNewProfileName('');
      showToast('success', 'Збережено', 'Профіль успішно збережено.');
    } catch {
      showToast('error', 'Помилка', 'Не вдалося зберегти профіль.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
    } catch {
      showToast('error', 'Помилка', 'Не вдалося видалити профіль.');
    }
  };

  const handleLoad = async (profile: Profile) => {
    try {
      if (profile.directoryHandle) {
        await loadDirectoryFromHandle(profile.directoryHandle, profile);
        showToast('success', 'Профіль завантажено', 'Директорію успішно відновлено.');
      } else {
        applySettings({
          useGitignore: profile.useGitignore,
          maxFileSizeKb: profile.maxFileSizeKb,
          ignoredExtensions: profile.ignoredExtensions,
          ignoredPaths: profile.ignoredPaths,
        });
        showToast('info', 'Налаштування застосовано', "Профіль застосовано без прив'язки до папки.");
      }
      onClose();
    } catch (error) {
      if (error instanceof Error) showToast('warning', 'Увага', error.message);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Менеджер профілів" onClose={onClose}>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        <input 
          className="settings-input" 
          style={{ flex: 1 }}
          placeholder="Назва нового профілю..." 
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!newProfileName.trim()}>
          <IconDeviceFloppy size={18} /> Зберегти
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {profiles.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Немає збережених профілів.</p>}
        {profiles.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-root)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {p.directoryHandle ? p.directoryHandle.name : 'Тільки налаштування'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant="secondary" onClick={() => handleLoad(p)}>Завантажити</Button>
              <Button variant="danger" onClick={() => handleDelete(p.id)}><IconTrash size={18}/></Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}