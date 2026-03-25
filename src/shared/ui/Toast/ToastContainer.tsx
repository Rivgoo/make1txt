// src/shared/ui/Toast/ToastContainer.tsx
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useToast } from '@/shared/context/useToast';
import type { ToastType } from '@/core/types/toast.types';
import './Toast.css';

const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <IconCheck size={20} color="var(--success)" />;
    case 'error': return <IconX size={20} color="var(--danger)" />;
    case 'warning': return <IconAlertTriangle size={20} color="var(--warning)" />;
    case 'info': return <IconInfoCircle size={20} color="var(--accent-primary)" />;
  }
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast toast--${toast.type}`}
          onClick={() => removeToast(toast.id)}
          data-tooltip="Натисніть, щоб закрити"
        >
          <div className="toast-icon">
            {getToastIcon(toast.type)}
          </div>
          <div className="toast-content">
            <h4>{toast.title}</h4>
            {toast.description && <p>{toast.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}