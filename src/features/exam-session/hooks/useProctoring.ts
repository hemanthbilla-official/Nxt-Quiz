import { useEffect, useCallback, useRef, useState } from "react";
import type { ExamControls } from "@/lib/exam-controls";
import { hasActiveExamNavigationIntent } from "@/lib/exam-navigation";
import { reportProctoringEvent } from "../services/examApi";

interface UseProctoringOptions {
  examId: string;
  attemptId: string | null;
  controls: ExamControls;
  loading: boolean;
}

interface UseProctoringResult {
  showTabWarning: boolean;
  setShowTabWarning: (show: boolean) => void;
}

export function useProctoring({
  examId,
  attemptId,
  controls,
  loading,
}: UseProctoringOptions): UseProctoringResult {
  const [showTabWarning, setShowTabWarning] = useState(false);
  const reportEventRef = useRef(() => {});

  const handleTabSwitch = useCallback(async () => {
    if (hasActiveExamNavigationIntent()) {
      return;
    }

    if (document.hidden && attemptId && !loading) {
      if (controls.tabSwitchWarningEnabled) {
        setShowTabWarning(true);
      }

      if (controls.proctoringEnabled) {
        try {
          await reportProctoringEvent(examId);
        } catch (err) {
          console.error("Failed to report proctoring event:", err);
        }
      }
    }
  }, [attemptId, controls.proctoringEnabled, controls.tabSwitchWarningEnabled, examId, loading]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleTabSwitch);
    return () =>
      document.removeEventListener("visibilitychange", handleTabSwitch);
  }, [handleTabSwitch]);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (controls.rightClickBlocked) {
        e.preventDefault();
      }
    },
    [controls.rightClickBlocked]
  );

  const handleClipboard = useCallback(
    (e: ClipboardEvent) => {
      if (controls.copyPasteBlocked) {
        e.preventDefault();
      }
    },
    [controls.copyPasteBlocked]
  );

  useEffect(() => {
    if (controls.rightClickBlocked) {
      document.addEventListener("contextmenu", handleContextMenu);
    }
    if (controls.copyPasteBlocked) {
      document.addEventListener("copy", handleClipboard);
      document.addEventListener("cut", handleClipboard);
      document.addEventListener("paste", handleClipboard);
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
    };
  }, [controls.copyPasteBlocked, controls.rightClickBlocked, handleContextMenu, handleClipboard]);

  return {
    showTabWarning,
    setShowTabWarning,
  };
}