import { useState, useCallback, useMemo } from "react";

interface UseBulkSelectionResult {
  selected: Record<string, boolean>;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleSelection: (id: string) => void;
  toggleAllInGroup: (ids: string[]) => void;
  clearSelection: () => void;
  selectedCount: number;
  isAllSelected: (ids: string[]) => boolean;
}

export function useBulkSelection(): UseBulkSelectionResult {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggleSelection = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleAllInGroup = useCallback((ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every((id) => selected[id]);
    setSelected((prev) => {
      const next = { ...prev };
      ids.forEach((id) => (next[id] = !allSelected));
      return next;
    });
  }, [selected]);

  const clearSelection = useCallback(() => {
    setSelected({});
  }, []);

  const selectedCount = useMemo(() => {
    return Object.values(selected).filter(Boolean).length;
  }, [selected]);

  const isAllSelected = useCallback((ids: string[]) => {
    return ids.length > 0 && ids.every((id) => selected[id]);
  }, [selected]);

  return {
    selected,
    setSelected,
    toggleSelection,
    toggleAllInGroup,
    clearSelection,
    selectedCount,
    isAllSelected,
  };
}