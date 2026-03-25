// src/features/control-panel/components/SettingsForm.tsx
import { useState, useEffect } from 'react';
import { useFileStore } from '@/store/useFileStore';
import { Button } from '@/shared/ui/Button/Button';
import './SettingsForm.css';

export function SettingsForm() {
  const { settings, applySettings } = useFileStore();
  
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleApply = () => {
    applySettings(localSettings);
  };

  return (
    <div className="settings-form">
      <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-xs)' }}>Параметри фільтрації</h3>
      
      <label className="settings-checkbox">
        <input 
          type="checkbox" 
          checked={localSettings.useGitignore}
          onChange={(e) => setLocalSettings(s => ({ ...s, useGitignore: e.target.checked }))}
        />
        Враховувати .gitignore
      </label>

      <div className="settings-group">
        <label>Максимальний розмір файлу (КБ) [0 = без ліміту]</label>
        <input 
          type="number" 
          className="settings-input"
          value={localSettings.maxFileSizeKb}
          onChange={(e) => setLocalSettings(s => ({ ...s, maxFileSizeKb: Number(e.target.value) }))}
        />
      </div>

      <div className="settings-group">
        <label>Ігнорувати розширення (через кому)</label>
        <input 
          type="text" 
          className="settings-input"
          placeholder=".exe, .dll, .pdf"
          value={localSettings.ignoredExtensions.join(', ')}
          onChange={(e) => setLocalSettings(s => ({ 
            ...s, 
            ignoredExtensions: e.target.value.split(',').map(x => x.trim()).filter(Boolean) 
          }))}
        />
      </div>

      <div className="settings-group">
        <label>Ігнорувати шляхи (через кому)</label>
        <input 
          type="text" 
          className="settings-input"
          placeholder="node_modules, dist, build"
          value={localSettings.ignoredPaths.join(', ')}
          onChange={(e) => setLocalSettings(s => ({ 
            ...s, 
            ignoredPaths: e.target.value.split(',').map(x => x.trim()).filter(Boolean) 
          }))}
        />
      </div>

      <Button variant="secondary" onClick={handleApply}>Застосувати фільтри</Button>
    </div>
  );
}