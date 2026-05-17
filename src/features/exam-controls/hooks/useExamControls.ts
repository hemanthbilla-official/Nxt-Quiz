import { useState, useEffect, useCallback } from "react";
import type { ExamControls } from "@/lib/exam-controls";
import { DEFAULT_EXAM_CONTROLS } from "@/lib/exam-controls";
import * as api from "../services/controlsApi";

interface UseExamControlsResult {
  controls: ExamControls;
  loading: boolean;
  saving: boolean;
  error: string | null;
  savedAt: string | null;
  message: string | null;
  enabledCount: number;
  updateControl: (key: keyof ExamControls) => void;
  setAll: (value: boolean) => void;
  resetDefaults: () => void;
  saveControls: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useExamControls(): UseExamControlsResult {
  const [controls, setControls] = useState<ExamControls>(DEFAULT_EXAM_CONTROLS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchControls();
      setControls(data.controls);
      if (data.updatedAt) setSavedAt(data.updatedAt);
      if (data.setupRequired) {
        setSetupRequired(true);
        setError("Database table is missing. Run the admin controls migration before saving changes.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load controls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateControl = useCallback((key: keyof ExamControls) => {
    setControls((current) => ({ ...current, [key]: !current[key] }));
    setMessage("");
  }, []);

  const setAll = useCallback((value: boolean) => {
    setControls((current) => {
      const next = { ...current };
      for (const key of Object.keys(next) as Array<keyof ExamControls>) {
        next[key] = value;
      }
      return next;
    });
    setMessage("");
  }, []);

  const resetDefaults = useCallback(() => {
    setControls(DEFAULT_EXAM_CONTROLS);
    setMessage("");
  }, []);

  const saveControls = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const data = await api.saveControls(controls);
      setControls(data.controls);
      setSavedAt(data.updatedAt || null);
      setError(null);
      setMessage("Controls saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save controls");
    } finally {
      setSaving(false);
    }
  }, [controls]);

  const enabledCount = Object.values(controls).filter(Boolean).length;

  return {
    controls,
    loading,
    saving,
    error: setupRequired ? "Database table is missing. Run the admin controls migration before saving changes." : error,
    savedAt,
    message,
    enabledCount,
    updateControl,
    setAll,
    resetDefaults,
    saveControls,
    refresh,
  };
}