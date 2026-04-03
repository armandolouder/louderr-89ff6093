import { useState, useCallback } from "react";
import { EmailBlock, BuilderState, BLOCK_DEFAULTS, BlockType } from "./types";

const generateId = () => crypto.randomUUID().slice(0, 8);

const DEFAULT_STATE: BuilderState = {
  blocks: [],
  selectedBlockId: null,
  globalStyles: {
    backgroundColor: "#f5f5f5",
    contentWidth: "600",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    borderRadius: "0px",
  },
};

export function useEmailBuilder(initialBlocks?: EmailBlock[]) {
  const [state, setState] = useState<BuilderState>({
    ...DEFAULT_STATE,
    blocks: initialBlocks || [],
  });

  const addBlock = useCallback((type: BlockType, index?: number) => {
    const defaults = BLOCK_DEFAULTS[type]();
    const block: EmailBlock = { id: generateId(), ...defaults };
    setState((s) => {
      const blocks = [...s.blocks];
      if (index !== undefined) blocks.splice(index, 0, block);
      else blocks.push(block);
      return { ...s, blocks, selectedBlockId: block.id };
    });
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<EmailBlock>) => {
    setState((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      blocks: s.blocks.filter((b) => b.id !== id),
      selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
    }));
  }, []);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    setState((s) => {
      const blocks = [...s.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...s, blocks };
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setState((s) => {
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return s;
      const clone: EmailBlock = { ...JSON.parse(JSON.stringify(s.blocks[idx])), id: generateId() };
      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, clone);
      return { ...s, blocks, selectedBlockId: clone.id };
    });
  }, []);

  const selectBlock = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedBlockId: id }));
  }, []);

  const setGlobalStyles = useCallback((styles: Partial<BuilderState["globalStyles"]>) => {
    setState((s) => ({ ...s, globalStyles: { ...s.globalStyles, ...styles } }));
  }, []);

  const selectedBlock = state.blocks.find((b) => b.id === state.selectedBlockId) || null;

  return {
    state,
    selectedBlock,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    duplicateBlock,
    selectBlock,
    setGlobalStyles,
  };
}
