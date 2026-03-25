// src/shared/ui/Modal/Modal.tsx
import type { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  title: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, title, maxWidth = '500px', onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ '--modal-max-width': maxWidth } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="context-menu-close-btn" onClick={onClose}>
            <IconX size={20} />
          </button>
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}