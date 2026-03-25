import { useState } from 'react';
import { 
  IconBrandGit, IconFileCode, IconFilter, 
  IconPlus, IconTrash, IconArrowUp, IconArrowDown, IconEyeOff, IconPencil,
  IconChecks, IconSquareX, IconEye
} from '@tabler/icons-react';
import { Button } from '@/shared/ui/Button/Button';
import { useFileStore } from '@/store/useFileStore';
import { isValidGlobOrRegex } from '@/core/services/IgnoreService';
import { useToast } from '@/shared/context/useToast';
import './QuickSettings.css';

export function QuickSettings() {
  const { 
    localFilters, toggleExtension, setAllExtensionsState, 
    addCustomPattern, updateCustomPattern, toggleCustomPattern, 
    removeCustomPattern, moveCustomPattern, toggleGitignore,
    toggleShowIgnored
  } = useFileStore();
  
  const { showToast } = useToast();
  
  const [newPattern, setNewPattern] = useState('');
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [editPatternValue, setEditPatternValue] = useState('');

  const sortedExtensions = Object.entries(localFilters.extensions)
    .sort((a, b) => b[1].count - a[1].count);

  const handleAddPattern = () => {
    if (!newPattern.trim()) return;
    if (!isValidGlobOrRegex(newPattern.trim())) {
      showToast('warning', 'Некоректний патерн', 'Вираз містить синтаксичну помилку.');
      return;
    }
    addCustomPattern(newPattern.trim());
    setNewPattern('');
  };

  const startEditPattern = (id: string, currentVal: string) => {
    setEditingPatternId(id);
    setEditPatternValue(currentVal);
  };

  const saveEditPattern = () => {
    if (!editingPatternId) return;
    if (!editPatternValue.trim()) {
      removeCustomPattern(editingPatternId);
    } else if (isValidGlobOrRegex(editPatternValue.trim())) {
      updateCustomPattern(editingPatternId, editPatternValue.trim());
    } else {
      showToast('warning', 'Некоректний патерн', 'Вираз відхилено.');
      return;
    }
    setEditingPatternId(null);
  };

  return (
    <div className="quick-settings">
      
      {sortedExtensions.length > 0 && (
        <div className="qs-section">
          <div className="qs-header">
            <span className="qs-title"><IconFileCode size={16}/> Розширення файлів</span>
            <div className="qs-header-actions">
              <Button variant="secondary" onClick={() => setAllExtensionsState(true)}>
                <IconChecks size={14} /> Усі
              </Button>
              <Button variant="secondary" onClick={() => setAllExtensionsState(false)}>
                <IconSquareX size={14} /> Жодного
              </Button>
            </div>
          </div>
          <div className="extensions-container">
            {sortedExtensions.map(([ext, stat]) => (
              <button 
                key={ext}
                className={`ext-chip ${stat.isActive ? '' : 'inactive'}`}
                onClick={() => toggleExtension(ext)}
                data-tooltip={stat.isActive ? 'Вимкнути' : 'Увімкнути'}
                data-tooltip-pos="top"
              >
                {!stat.isActive && <IconEyeOff size={12} />}
                {ext} <span className="ext-count">{stat.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="qs-section">
        <div className="qs-header">
          <span className="qs-title"><IconFilter size={16}/> Власні правила ігнорування</span>
        </div>
        
        {localFilters.customPatterns.length > 0 && (
          <div className="patterns-list">
            {localFilters.customPatterns.map((p) => (
              <div key={p.id} className={`pattern-item ${p.isActive ? '' : 'inactive'}`}>
                {editingPatternId === p.id ? (
                  <input 
                    className="pattern-edit-input"
                    autoFocus
                    value={editPatternValue}
                    onChange={(e) => setEditPatternValue(e.target.value)}
                    onBlur={saveEditPattern}
                    onKeyDown={(e) => e.key === 'Enter' && saveEditPattern()}
                  />
                ) : (
                  <span style={{ cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => toggleCustomPattern(p.id)}>
                    {p.pattern}
                  </span>
                )}
                
                {editingPatternId !== p.id && (
                  <div className="pattern-actions">
                    <button className="pattern-btn" onClick={() => moveCustomPattern(p.id, 'up')}><IconArrowUp size={14}/></button>
                    <button className="pattern-btn" onClick={() => moveCustomPattern(p.id, 'down')}><IconArrowDown size={14}/></button>
                    <button className="pattern-btn" onClick={() => startEditPattern(p.id, p.pattern)}><IconPencil size={14}/></button>
                    <button className="pattern-btn" onClick={() => toggleCustomPattern(p.id)}><IconEyeOff size={14}/></button>
                    <button className="pattern-btn danger" onClick={() => removeCustomPattern(p.id)}><IconTrash size={14}/></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pattern-input-group">
          <input 
            className="pattern-input" 
            placeholder="Напр. *.spec.ts, /tests/" 
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPattern()}
          />
          <button className="pattern-btn" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 8px' }} onClick={handleAddPattern}>
            <IconPlus size={16} color="var(--accent-primary)"/>
          </button>
        </div>
      </div>

      <div className="qs-section">
        <div 
          className={`toggle-row ${localFilters.hasGitignore ? (localFilters.useGitignore ? 'active' : '') : 'disabled'}`}
          onClick={() => localFilters.hasGitignore && toggleGitignore()}
          data-tooltip={!localFilters.hasGitignore ? 'Файл .gitignore не знайдено в корені' : ''}
          data-tooltip-pos="top"
        >
          <span className="qs-title"><IconBrandGit size={16}/> Враховувати .gitignore</span>
          <div className="toggle-switch" />
        </div>

        <div 
          className={`toggle-row ${localFilters.showIgnored ? 'active' : ''}`}
          onClick={toggleShowIgnored}
        >
          <span className="qs-title"><IconEye size={16}/> Показати ігноровані файли</span>
          <div className="toggle-switch" />
        </div>
      </div>

    </div>
  );
}