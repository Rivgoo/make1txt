import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconFileCode, IconFilter, 
  IconPlus, IconTrash, IconArrowUp, IconArrowDown, IconEyeOff, IconPencil,
  IconChecks, IconSquareX, IconEye, IconBinaryTree, IconWorld, IconMapPin, IconFolderOff, IconAlertCircle, IconLoader2
} from '@tabler/icons-react';
import { Button } from '@/shared/ui/Button/Button';
import { useFileStore } from '@/store/useFileStore';
import { isValidGlobOrRegex } from '@/core/services/IgnoreService';
import { useToast } from '@/shared/context/useToast';
import './QuickSettings.css';

export function QuickSettings() {
  const { t } = useTranslation();
  const { 
    localFilters, updateLocalFilters, toggleExtension, setAllExtensionsState, 
    addCustomPattern, updateCustomPattern, toggleCustomPattern, removeCustomPattern, moveCustomPattern,
    globalSettings, needsManualTokenization, isTokenizing, runTokenization
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
      showToast('warning', t('common.warning'), t('quickSettings.invalidPattern'));
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
      showToast('warning', t('common.warning'), t('quickSettings.ruleRejected'));
      return;
    }
    setEditingPatternId(null);
  };

  return (
    <div className="quick-settings">

      {(needsManualTokenization || isTokenizing) && (
        <div className="qs-section" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'var(--warning)' }}>
          <div className="qs-header">
            <span className="qs-title" style={{ color: 'var(--warning)' }}>
              {isTokenizing ? <IconLoader2 size={16} className="spin" /> : <IconAlertCircle size={16} />} 
              {t('quickSettings.tokenWarningTitle')}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {t('quickSettings.tokenWarningDesc')}
          </p>
          <Button 
            variant="secondary" 
            onClick={() => runTokenization(true)} 
            disabled={isTokenizing}
            style={{ marginTop: 'var(--spacing-xs)', borderColor: 'var(--warning)', color: 'var(--warning)' }}
          >
            {isTokenizing ? t('quickSettings.calculatingTokens') : t('quickSettings.calculateExact')}
          </Button>
        </div>
      )}
      
      {sortedExtensions.length > 0 && (
        <div className="qs-section">
          <div className="qs-header">
            <span className="qs-title"><IconFileCode size={16}/> {t('quickSettings.extensions')}</span>
            <div className="qs-header-actions">
              <Button variant="secondary" onClick={() => setAllExtensionsState(true)}>
                <IconChecks size={14} /> {t('common.all')}
              </Button>
              <Button variant="secondary" onClick={() => setAllExtensionsState(false)}>
                <IconSquareX size={14} /> {t('common.none')}
              </Button>
            </div>
          </div>
          <div className="extensions-container">
            {sortedExtensions.map(([ext, stat]) => (
              <button 
                key={ext}
                className={`ext-chip ${stat.isActive ? '' : 'inactive'}`}
                onClick={() => toggleExtension(ext)}
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
          <span className="qs-title"><IconFilter size={16}/> {t('quickSettings.customRules')}</span>
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
            placeholder={t('quickSettings.placeholder')} 
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
        {!globalSettings.pruneIgnoredOnRead && (
          <div 
            className={`toggle-row ${localFilters.showGloballyIgnored ? 'active' : ''}`}
            onClick={() => updateLocalFilters({ showGloballyIgnored: !localFilters.showGloballyIgnored })}
          >
            <span className="qs-title"><IconWorld size={16}/> {t('quickSettings.showGloballyIgnored')}</span>
            <div className="toggle-switch" />
          </div>
        )}

        <div 
          className={`toggle-row ${localFilters.showLocallyIgnored ? 'active' : ''}`}
          onClick={() => updateLocalFilters({ showLocallyIgnored: !localFilters.showLocallyIgnored })}
        >
          <span className="qs-title"><IconMapPin size={16}/> {t('quickSettings.showLocallyIgnored')}</span>
          <div className="toggle-switch" />
        </div>

        <div 
          className={`toggle-row ${localFilters.showEmptyFolders ? 'active' : ''}`}
          onClick={() => updateLocalFilters({ showEmptyFolders: !localFilters.showEmptyFolders })}
        >
          <span className="qs-title"><IconFolderOff size={16}/> {t('quickSettings.showEmptyFolders')}</span>
          <div className="toggle-switch" />
        </div>
      </div>

      <div className="qs-section">
        <div 
          className={`toggle-row ${localFilters.generateTree ? 'active' : ''}`}
          onClick={() => updateLocalFilters({ generateTree: !localFilters.generateTree })}
        >
          <span className="qs-title"><IconBinaryTree size={16}/> {t('quickSettings.generateStructure')}</span>
          <div className="toggle-switch" />
        </div>

        <div 
          className={`toggle-row ${!localFilters.generateTree ? 'disabled' : (localFilters.treeIncludeIgnored ? 'active' : '')}`}
          onClick={() => localFilters.generateTree && updateLocalFilters({ treeIncludeIgnored: !localFilters.treeIncludeIgnored })}
        >
          <span className="qs-title"><IconEye size={16}/> {t('quickSettings.structureIncludeIgnored')}</span>
          <div className="toggle-switch" />
        </div>
      </div>

    </div>
  );
}