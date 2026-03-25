// src/shared/context/ToastProvider.tsx
import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ToastMessage, ToastType } from '@/core/types/toast.types';
import { ToastContext } from './useToast';

const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (type: ToastType, title: string, description?: string) => {
    const newToast: ToastMessage = {
      id: crypto.randomUUID(),
      type,
      title,
      description,
    };
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}