import { useTranslation } from 'react-i18next';
import { IconCode, IconWorld, IconAlertTriangle, IconHome } from '@tabler/icons-react';
import { Button } from '@/shared/ui/Button/Button';
import './SyncOverlay.css';

interface SyncOverlayProps {
  status: 'loading' | 'error';
  onReset: () => void;
}

export function SyncOverlay({ status, onReset }: SyncOverlayProps) {
  const { t } = useTranslation();

  if (status === 'error') {
    return (
      <div className="sync-overlay">
        <IconAlertTriangle size={64} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h2>{t('sync.errorTitle', 'Connection Failed')}</h2>
        <p>{t('sync.errorDesc', 'Could not fetch data from your IDE. The server might have timed out or the token is invalid.')}</p>
        <Button variant="primary" onClick={onReset}>
          <IconHome size={18} /> {t('sync.goHome', 'Go to Home')}
        </Button>
      </div>
    );
  }

  return (
    <div className="sync-overlay">
      <div className="sync-icon-container">
        <IconCode size={48} />
        <div className="sync-pulse" />
        <IconWorld size={48} color="var(--accent-primary)" />
      </div>
      <h2>{t('sync.loadingTitle', 'Syncing with IDE...')}</h2>
      <p>{t('sync.loadingDesc', 'Securely transferring your workspace context via localhost bridge.')}</p>
    </div>
  );
}