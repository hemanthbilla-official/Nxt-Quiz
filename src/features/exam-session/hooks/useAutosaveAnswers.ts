import { useRef, useCallback, useEffect, useState } from "react";
import type { AnswerState } from "@/types";
import { saveBulkAnswers } from "../services/examApi";

const DEBOUNCE_MS = 500;
const MAX_RETRY_DELAY_MS = 8000;
const INITIAL_RETRY_DELAY_MS = 1000;

interface UseAutosaveOptions {
  examId: string;
  attemptId: string | null;
  getLocalStorageKey: () => string | null;
}

export function useAutosaveAnswers({
  examId,
  attemptId,
  getLocalStorageKey,
}: UseAutosaveOptions) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Record<string, AnswerState>>({});
  const isSyncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const [isPending, setIsPending] = useState(false);

  const saveToLocalStorage = useCallback(
    (questionId: string, state: AnswerState) => {
      const key = getLocalStorageKey();
      if (!key) return;

      try {
        const stored = localStorage.getItem(key);
        const answersMap = stored ? JSON.parse(stored) : {};
        answersMap[questionId] = { ...state, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(answersMap));
      } catch {
        /* ignore */
      }
    },
    [getLocalStorageKey]
  );

  const loadFromLocalStorage = useCallback((): Record<string, AnswerState> | null => {
    const key = getLocalStorageKey();
    if (!key) return null;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const result: Record<string, AnswerState> = {};
      for (const [qId, val] of Object.entries(parsed)) {
        const entry = val as AnswerState & { savedAt?: number };
        const { savedAt, ...state } = entry;
        result[qId] = state;
      }
      return result;
    } catch {
      return null;
    }
  }, [getLocalStorageKey]);

  const clearLocalStorage = useCallback(() => {
    const key = getLocalStorageKey();
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [getLocalStorageKey]);

  const flushQueue = useCallback(async (): Promise<void> => {
    if (!attemptId || isSyncingRef.current) return;
    const currentQueue = { ...queueRef.current };
    if (Object.keys(currentQueue).length === 0) {
      setIsPending(false);
      return;
    }

    isSyncingRef.current = true;
    queueRef.current = {};
    retryCountRef.current = 0;

    try {
      await saveBulkAnswers(examId, attemptId, currentQueue);
      setIsPending(false);
    } catch {
      const entriesWithTimestamps = Object.entries(currentQueue) as [string, AnswerState & { _failedAt?: number }][];
      const freshFailed = Object.fromEntries(
        entriesWithTimestamps.map(([qId, state]) => [
          qId,
          { ...state, _failedAt: Date.now() },
        ])
      ) as Record<string, AnswerState>;

      const existing = queueRef.current;
      queueRef.current = { ...freshFailed, ...existing };

      if (Object.keys(queueRef.current).length > 0) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY_MS
        );
        retryCountRef.current += 1;
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(flushQueue, delay);
      }
    } finally {
      isSyncingRef.current = false;
      const remaining = Object.keys(queueRef.current).length;
      if (remaining > 0) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(flushQueue, DEBOUNCE_MS);
      } else {
        setIsPending(false);
      }
    }
  }, [attemptId, examId]);

  const saveAnswerDebounced = useCallback(
    (questionId: string, state: AnswerState) => {
      if (!attemptId) return;

      saveToLocalStorage(questionId, state);
      queueRef.current[questionId] = state;
      setIsPending(true);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;

      saveTimeoutRef.current = setTimeout(flushQueue, DEBOUNCE_MS);
    },
    [attemptId, saveToLocalStorage, flushQueue]
  );

  const drainQueue = useCallback(async (): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (Object.keys(queueRef.current).length > 0 || isSyncingRef.current) {
      await flushQueue();
    }
  }, [flushQueue]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (Object.keys(queueRef.current).length > 0 && !isSyncingRef.current && attemptId) {
          const data = JSON.stringify({ attemptId, answers: queueRef.current });
          navigator.sendBeacon(
            `/api/exam/${examId}/answer`,
            new Blob([data], { type: "application/json" })
          );
          queueRef.current = {};
        }
      }
    };

    const handleBeforeUnload = () => {
      if (Object.keys(queueRef.current).length > 0 && attemptId) {
        const data = JSON.stringify({ attemptId, answers: queueRef.current });
        navigator.sendBeacon(
          `/api/exam/${examId}/answer`,
          new Blob([data], { type: "application/json" })
        );
        queueRef.current = {};
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (Object.keys(queueRef.current).length > 0 && attemptId) {
        const data = JSON.stringify({ attemptId, answers: queueRef.current });
        navigator.sendBeacon(
          `/api/exam/${examId}/answer`,
          new Blob([data], { type: "application/json" })
        );
      }
    };
  }, [attemptId, examId]);

  return {
    saveAnswer: saveAnswerDebounced,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    flushQueue: drainQueue,
    isPending,
  };
}
