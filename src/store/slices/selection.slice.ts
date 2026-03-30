import type { StateCreator } from 'zustand';
import type { FileStore, SelectionSlice } from '../store.types';
import { estimateTokenCount } from '@/core/utils/stats.utils';

export const createSelectionSlice: StateCreator<FileStore, [], [], SelectionSlice> = (set, get) => ({
  toggleSelection: (id, checked) => {
    set((state) => {
      const target = state.nodes.find(n => n.id === id);
      if (!target || target.isIgnored) return state;

      const pathPrefix = `${target.relativePath}/`;

      const newNodes = state.nodes.map(node => {
        if (node.isIgnored) return node;
        if (node.id === id || node.relativePath.startsWith(pathPrefix)) {
          return { ...node, isSelected: checked };
        }
        return node;
      });

      return { nodes: newNodes };
    });
    get().evaluateTokenization();
  },

  toggleExpand: (id) => {
    set((state) => ({
      nodes: state.nodes.map(node => node.id === id ? { ...node, isExpanded: !node.isExpanded } : node)
    }));
  },

  selectAll: () => {
    set((state) => ({
      nodes: state.nodes.map(node => node.isIgnored ? node : { ...node, isSelected: true })
    }));
    get().evaluateTokenization();
  },

  deselectAll: () => {
    set((state) => ({
      nodes: state.nodes.map(node => node.isIgnored ? node : { ...node, isSelected: false })
    }));
    get().evaluateTokenization();
  },

  getStats: () => {
    const { nodes, realTokenMap } = get();
    
    let totalFiles = 0;
    let selectedFiles = 0;
    let totalSizeBytes = 0;
    let tokens = 0;
    let allSelectedHaveRealTokens = true;

    for (const node of nodes) {
      if (node.isDirectory) continue;
      
      if (!node.isIgnored) totalFiles++;
      
      if (node.isSelected && !node.isIgnored) {
        selectedFiles++;
        totalSizeBytes += node.sizeBytes;
        
        if (realTokenMap[node.id] !== undefined) {
          tokens += realTokenMap[node.id];
        } else {
          tokens += estimateTokenCount(node.sizeBytes);
          allSelectedHaveRealTokens = false;
        }
      }
    }

    const estimatedTotal = estimateTokenCount(totalSizeBytes);
    if (selectedFiles === 0) allSelectedHaveRealTokens = false;

    return {
      totalFiles,
      selectedFiles,
      totalSizeBytes,
      totalWords: Math.floor(estimatedTotal * 0.75),
      tokens,
      isExactTokens: allSelectedHaveRealTokens,
    };
  }
});