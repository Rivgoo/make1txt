// src/features/control-panel/hooks/useHotkey.ts
import { useEffect } from 'react';

export function useHotkey(key: string, ctrlOrCmd: boolean, callback: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = ctrlOrCmd ? (event.ctrlKey || event.metaKey) : true;
      if (event.key.toLowerCase() === key.toLowerCase() && isModifierPressed) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, ctrlOrCmd, callback]);
}