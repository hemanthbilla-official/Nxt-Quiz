import { useState, useCallback } from "react";
import type { EditorFile } from "@/lib/editorTypes";

const MAX_HISTORY = 20;

export function useCodeHistory() {
  const [history, setHistory] = useState<EditorFile[][]>([]);

  const pushHistory = useCallback((files: EditorFile[]) => {
    setHistory((prev) => [...prev.slice(-MAX_HISTORY + 1), files]);
  }, []);

  const undo = useCallback((): EditorFile[] | null => {
    if (history.length === 0) return null;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    return previous;
  }, [history]);

  const canUndo = history.length > 0;

  return {
    history,
    pushHistory,
    undo,
    canUndo,
  };
}