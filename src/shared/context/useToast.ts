// src/shared/context/useToast.ts
import { createContext, useContext } from 'react';
import type { ToastMessage, ToastType } from '@/core/types/toast.types';

export interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (type: ToastType, title: string, description?: string) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}