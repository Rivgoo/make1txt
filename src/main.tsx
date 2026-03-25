// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '@/shared/context/ToastProvider';
import { ToastContainer } from '@/shared/ui/Toast/ToastContainer';
import '@/assets/styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
      <ToastContainer />
    </ToastProvider>
  </StrictMode>,
);