import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { ToastProvider } from '@/shared/context/ToastProvider';
import { ToastContainer } from '@/shared/ui/Toast/ToastContainer';
import '@/core/i18n';
import '@/assets/styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
      <ToastContainer />
      <Analytics />
    </ToastProvider>
  </StrictMode>
);