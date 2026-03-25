import { useState, useEffect } from 'react';
import { IconRestore, IconDatabase, IconCode, IconFileZip, IconPlus, IconX } from '@tabler/icons-react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Button } from '@/shared/ui/Button/Button';
import { useFileStore, DEFAULT_GLOBAL_SETTINGS } from '@/store/useFileStore';
import './AdvancedSettingsModal.css';

const PRESETS = [
  { name: 'Стандарт', template: '================================================================\nFile: {{path}}\n================================================================\n\n{{content}}\n\n' },
  { name: 'Мінімум', template: '--- {{path}} ---\n{{content}}\n' },
  { name: 'Markdown', template: '### `{{path}}`\n```\n{{content}}\n```\n\n' }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedSettingsModal({ isOpen, onClose }: Props) {
  const { globalSettings, updateGlobalSettings, resetGlobalSettings } = useFileStore();
  const [local, setLocal] = useState(globalSettings);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  
  const [newExt, setNewExt] = useState('');
  const [newPath, setNewPath] = useState('');

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setLocal(globalSettings);
      setNewExt('');
      setNewPath('');
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handler = setTimeout(() => {
      if (JSON.stringify(local) !== JSON.stringify(globalSettings)) {
        updateGlobalSettings(local);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [local, updateGlobalSettings, globalSettings, isOpen]);

  const handleReset = () => {
    if (confirm('Ви впевнені, що хочете скинути всі глобальні налаштування до стандартних?')) {
      resetGlobalSettings();
      setLocal(DEFAULT_GLOBAL_SETTINGS);
    }
  };

  const addExt = () => {
    const val = newExt.trim().toLowerCase();
    if (val && !local.ignoredExtensions.includes(val)) {
      setLocal({ ...local, ignoredExtensions: [...local.ignoredExtensions, val] });
    }
    setNewExt('');
  };

  const removeExt = (extToRemove: string) => {
    setLocal({ ...local, ignoredExtensions: local.ignoredExtensions.filter(e => e !== extToRemove) });
  };

  const addPath = () => {
    const val = newPath.trim();
    if (val && !local.ignoredPaths.includes(val)) {
      setLocal({ ...local, ignoredPaths: [...local.ignoredPaths, val] });
    }
    setNewPath('');
  };

  const removePath = (pathToRemove: string) => {
    setLocal({ ...local, ignoredPaths: local.ignoredPaths.filter(p => p !== pathToRemove) });
  };

  const previewText = local.outputTemplate
    .replace(/{{path}}/g, 'src/main.ts')
    .replace(/{{content}}/g, 'console.log("Hello World");');

  return (
    <Modal isOpen={isOpen} title="Розширені налаштування" maxWidth="800px" onClose={onClose}>
      <div className="advanced-settings-body">
        
        <div className="as-section">
          <h4><IconFileZip size={18}/> Ліміти та ігнорування</h4>
          
          <div className="as-grid">
            <div className="as-group">
              <label>Глобально ігноровані розширення</label>
              <div className="as-tag-input-row">
                <input 
                  className="as-input"
                  placeholder=".exe, .dll"
                  value={newExt}
                  onChange={(e) => setNewExt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExt()}
                />
                <Button variant="secondary" onClick={addExt}><IconPlus size={16}/></Button>
              </div>
              <div className="as-tag-container">
                {local.ignoredExtensions.map(ext => (
                  <span key={ext} className="as-tag-chip">
                    {ext}
                    <button className="as-tag-remove" onClick={() => removeExt(ext)}><IconX size={12}/></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="as-group">
              <label>Глобально ігноровані директорії</label>
              <div className="as-tag-input-row">
                <input 
                  className="as-input"
                  placeholder="node_modules, .git"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPath()}
                />
                <Button variant="secondary" onClick={addPath}><IconPlus size={16}/></Button>
              </div>
              <div className="as-tag-container">
                {local.ignoredPaths.map(p => (
                  <span key={p} className="as-tag-chip">
                    {p}
                    <button className="as-tag-remove" onClick={() => removePath(p)}><IconX size={12}/></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="as-group">
            <label>Максимальний розмір файлу (КБ) [0 = без ліміту]</label>
            <input 
              type="number" 
              className="as-input"
              value={local.maxFileSizeKb}
              onChange={(e) => setLocal({ ...local, maxFileSizeKb: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="as-section">
          <h4><IconDatabase size={18}/> Загальна поведінка</h4>
          <label className="as-checkbox-row">
            <input 
              type="checkbox"
              style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
              checked={local.useGitignoreDefault}
              onChange={(e) => setLocal({ ...local, useGitignoreDefault: e.target.checked })}
            />
            Використовувати .gitignore за замовчуванням (якщо знайдено)
          </label>
        </div>

        <div className="as-section">
          <h4><IconCode size={18}/> Форматування виводу</h4>
          <div className="as-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Шаблон склеювання файлів. Доступні змінні: {'{{path}}'}, {'{{content}}'}</label>
              <div className="as-presets-row">
                {PRESETS.map(preset => (
                  <Button 
                    key={preset.name} 
                    variant="secondary" 
                    onClick={() => setLocal({ ...local, outputTemplate: preset.template })}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
            
            <textarea 
              className="as-textarea"
              value={local.outputTemplate}
              onChange={(e) => setLocal({ ...local, outputTemplate: e.target.value })}
            />

            <div className="as-preview-box">
              <span className="as-preview-label">Приклад виводу:</span>
              <pre>{previewText}</pre>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}>
          <Button variant="danger" onClick={handleReset}>
            <IconRestore size={16}/> Скинути до дефолтних
          </Button>
        </div>

      </div>
    </Modal>
  );
}