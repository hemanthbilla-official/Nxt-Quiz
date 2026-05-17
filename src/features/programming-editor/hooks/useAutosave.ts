import { useRef, useEffect, useCallback } from "react";

interface UseAutosaveOptions {
  onSave: (code: string, immediate?: boolean) => void;
  delay?: number;
}

export function useAutosave({ onSave, delay = 2500 }: UseAutosaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (code: string, immediate = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (immediate) {
        onSave(code, true);
        return;
      }

      timerRef.current = setTimeout(() => {
        onSave(code);
      }, delay);
    },
    [onSave, delay]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { save };
}