import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import './VirtualList.css';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

export function VirtualList<T>({ items, itemHeight, renderItem, overscan = 5 }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setViewportHeight(entries[0].contentRect.height);
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div 
      className="virtual-scroll-viewport" 
      ref={viewportRef} 
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div className="virtual-scroll-container" style={{ height: totalHeight }}>
        <div className="virtual-scroll-content" style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}