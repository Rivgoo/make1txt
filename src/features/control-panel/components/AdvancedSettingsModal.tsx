import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconRestore, IconDatabase, IconCode, IconFileZip, IconPlus, IconX, IconBinaryTree, IconLanguage } from '@tabler/icons-react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Button } from '@/shared/ui/Button/Button';
import { Select } from '@/shared/ui/Select/Select';
import { useFileStore, DEFAULT_GLOBAL_SETTINGS, DEFAULT_TREE_SYMBOLS } from '@/store/useFileStore';
import { generateTextTree } from '@/core/utils/tree.utils';
import type { FileNode, FileSystemHandle } from '@/core/types/file.types';
import './AdvancedSettingsModal.css';

const fakeHandle = { kind: 'file', name: 'fake' } as FileSystemHandle;

const MOCK_TREE_NODES: Partial<FileNode>[] = [
  { id: 'root', name: 'project-root', isDirectory: true, isIgnored: false, parentId: null, handle: fakeHandle },
  { id: '1', name: 'config.json', isDirectory: false, isIgnored: false, parentId: 'root', handle: fakeHandle },
  { id: '2', name: 'src', isDirectory: true, isIgnored: false, parentId: 'root', handle: fakeHandle },
  { id: '3', name: 'index.ts', isDirectory: false, isIgnored: false, parentId: '2', handle: fakeHandle },
  { id: '4', name: 'components', isDirectory: true, isIgnored: false, parentId: '2', handle: fakeHandle },
  { id: '5', name: 'Button.tsx', isDirectory: false, isIgnored: false, parentId: '4', handle: fakeHandle },
  { id: '6', name: 'utils', isDirectory: true, isIgnored: false, parentId: '4', handle: fakeHandle },
  { id: '7', name: 'helpers', isDirectory: true, isIgnored: false, parentId: '6', handle: fakeHandle },
  { id: '8', name: 'math.ts', isDirectory: false, isIgnored: false, parentId: '7', handle: fakeHandle },
  { id: '9', name: 'deep', isDirectory: true, isIgnored: false, parentId: '7', handle: fakeHandle },
  { id: '10', name: 'core.ts', isDirectory: false, isIgnored: false, parentId: '9', handle: fakeHandle },
  { id: '11', name: 'styles.css', isDirectory: false, isIgnored: false, parentId: '2', handle: fakeHandle },
  { id: '12', name: 'node_modules', isDirectory: true, isIgnored: true, parentId: 'root', handle: fakeHandle },
  { id: '13', name: 'README.md', isDirectory: false, isIgnored: false, parentId: 'root', handle: fakeHandle },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedSettingsModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { globalSettings, updateGlobalSettings, resetGlobalSettings } = useFileStore();
  const [local, setLocal] = useState(globalSettings);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  
  const [newExt, setNewExt] = useState('');
  const [newPath, setNewPath] = useState('');

  const PRESETS = [
    { name: 'Standard', template: '================================================================\nFile: {{path}}\n================================================================\n\n{{content}}\n\n' },
    { name: 'Minimal', template: '--- {{path}} ---\n{{content}}\n' },
    { name: 'Markdown', template: '### `{{path}}`\n```\n{{content}}\n```\n\n' }
  ];

  const TREE_PRESETS = [
    { name: 'ASCII', symbols: DEFAULT_TREE_SYMBOLS },
    { name: 'Simple', symbols: { branch: '|- ', last: '`- ', vertical: '|  ', space: '   ', ignoredSuffix: ' (ignored)' } },
    { name: 'Indent', symbols: { branch: '  ', last: '  ', vertical: '  ', space: '  ', ignoredSuffix: ' (ignored)' } }
  ];

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
    if (window.confirm(t('settings.resetConfirm'))) {
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

  const treePreviewRaw = generateTextTree(MOCK_TREE_NODES as FileNode[], {
    includeIgnored: true,
    symbols: local.treeSymbols
  });
  
  const treePreviewText = local.treeWrapper.replace('{{tree}}', treePreviewRaw);

  const placementOptions = [
    { value: 'top', label: t('settings.labels.placementTop') },
    { value: 'bottom', label: t('settings.labels.placementBottom') }
  ];

  const languageOptions = [
    { value: 'auto', label: t('settings.langAuto') },
    { value: 'en', label: t('settings.langEn') },
    { value: 'uk', label: t('settings.langUk') }
  ];

  return (
    <Modal isOpen={isOpen} title={t('settings.title')} maxWidth="850px" onClose={onClose}>
      <div className="advanced-settings-body">
        
        <div className="as-section">
          <h4><IconLanguage size={18}/> {t('settings.language')}</h4>
          <div className="as-group" style={{ maxWidth: '300px' }}>
            <Select 
              options={languageOptions}
              value={local.language}
              onChange={(val) => setLocal({ ...local, language: val as 'auto' | 'en' | 'uk' })}
            />
          </div>
        </div>

        <div className="as-section">
          <h4><IconFileZip size={18}/> {t('settings.sections.limits')}</h4>
          <div className="as-grid">
            <div className="as-group">
              <label>{t('settings.labels.globalExts')}</label>
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
              <label>{t('settings.labels.globalPaths')}</label>
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
            <label>{t('settings.labels.maxFileSize')}</label>
            <input 
              type="number" 
              className="as-input"
              value={local.maxFileSizeKb}
              onChange={(e) => setLocal({ ...local, maxFileSizeKb: Number(e.target.value) })}
            />
          </div>

          <label className="as-checkbox-row" style={{ marginTop: 'var(--spacing-sm)' }}>
            <input 
              type="checkbox"
              style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
              checked={local.pruneIgnoredOnRead}
              onChange={(e) => setLocal({ ...local, pruneIgnoredOnRead: e.target.checked })}
            />
            {t('settings.labels.pruneIgnored')}
          </label>
        </div>

        <div className="as-section">
          <h4><IconDatabase size={18}/> {t('settings.sections.behavior')}</h4>
          <label className="as-checkbox-row">
            <input 
              type="checkbox"
              style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
              checked={local.useGitignoreDefault}
              onChange={(e) => setLocal({ ...local, useGitignoreDefault: e.target.checked })}
            />
            {t('settings.labels.useGitignore')}
          </label>
        </div>

        <div className="as-section">
          <h4><IconBinaryTree size={18}/> {t('settings.sections.structure')}</h4>
          <div className="as-grid">
            <div className="as-group">
              <label>{t('settings.labels.structurePlacement')}</label>
              <Select 
                options={placementOptions}
                value={local.treePlacement}
                onChange={(val) => setLocal({ ...local, treePlacement: val as 'top' | 'bottom' })}
              />

              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>{t('settings.labels.configSymbols')}</label>
                  <div className="as-presets-row" style={{ marginBottom: 0 }}>
                    {TREE_PRESETS.map(preset => (
                      <Button 
                        key={preset.name} 
                        variant="secondary" 
                        onClick={() => setLocal({ ...local, treeSymbols: preset.symbols })}
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="as-tree-symbols-grid">
                  <div className="as-tree-symbol-item">
                    <label>{t('settings.labels.branch')}</label>
                    <input className="as-input" value={local.treeSymbols.branch} onChange={e => setLocal({...local, treeSymbols: {...local.treeSymbols, branch: e.target.value}})} />
                  </div>
                  <div className="as-tree-symbol-item">
                    <label>{t('settings.labels.last')}</label>
                    <input className="as-input" value={local.treeSymbols.last} onChange={e => setLocal({...local, treeSymbols: {...local.treeSymbols, last: e.target.value}})} />
                  </div>
                  <div className="as-tree-symbol-item">
                    <label>{t('settings.labels.vertical')}</label>
                    <input className="as-input" value={local.treeSymbols.vertical} onChange={e => setLocal({...local, treeSymbols: {...local.treeSymbols, vertical: e.target.value}})} />
                  </div>
                  <div className="as-tree-symbol-item">
                    <label>{t('settings.labels.space')}</label>
                    <input className="as-input" value={local.treeSymbols.space} onChange={e => setLocal({...local, treeSymbols: {...local.treeSymbols, space: e.target.value}})} />
                  </div>
                </div>
                <div className="as-tree-symbol-item" style={{ marginTop: 'var(--spacing-xs)' }}>
                  <label>{t('settings.labels.ignoredMark')}</label>
                  <input className="as-input" value={local.treeSymbols.ignoredSuffix} onChange={e => setLocal({...local, treeSymbols: {...local.treeSymbols, ignoredSuffix: e.target.value}})} />
                </div>
              </div>
            </div>
            
            <div className="as-group">
              <label>{t('settings.labels.structureWrapper')}</label>
              <textarea 
                className="as-textarea"
                style={{ minHeight: '60px' }}
                value={local.treeWrapper}
                onChange={(e) => setLocal({ ...local, treeWrapper: e.target.value })}
              />
              <div className="as-preview-box" style={{ marginTop: 'var(--spacing-xs)' }}>
                <span className="as-preview-label">{t('settings.labels.previewStructure')}</span>
                <pre>{treePreviewText}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="as-section">
          <h4><IconCode size={18}/> {t('settings.sections.formatting')}</h4>
          <div className="as-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>{t('settings.labels.outputTemplate')}</label>
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
              <span className="as-preview-label">{t('settings.labels.previewOutput')}</span>
              <pre>{previewText}</pre>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}>
          <Button variant="danger" onClick={handleReset}>
            <IconRestore size={16}/> {t('settings.resetToDefault')}
          </Button>
        </div>

      </div>
    </Modal>
  );
}