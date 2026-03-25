// src/App.tsx
import { useState, useEffect, useRef } from 'react';
import { FileBrowser } from '@/features/file-browser/FileBrowser';
import { ControlPanel } from '@/features/control-panel/ControlPanel';
import '@/features/layout/Layout.css';

export default function App() {
  const [leftWidth, setLeftWidth] = useState(() => {
    const cached = localStorage.getItem('splitterWidth');
    return cached ? Number(cached) : 60;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 25 && newWidth <= 75) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        localStorage.setItem('splitterWidth', leftWidth.toString());
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, leftWidth]);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  return (
    <div 
      className={`app-layout ${isDragging ? 'is-dragging' : ''}`}
      style={{ gridTemplateColumns: `${leftWidth}% 4px ${100 - leftWidth}%` }}
    >
      <FileBrowser />
      <div className="layout-resizer" onMouseDown={handleMouseDown} />
      <ControlPanel />
    </div>
  );
}