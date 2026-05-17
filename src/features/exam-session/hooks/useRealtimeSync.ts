import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "react-toastify";
import { checkExamStatus } from "../services/examApi";

const POLL_INTERVAL_MS = 10_000;

interface UseRealtimeSyncOptions {
  examId: string;
  attemptId: string | null;
  serverDrift: number;
  onExamClosed: () => void;
  onTimeExtended: (newTimeLeft: number) => void;
}

async function checkAndHandleClosed(
  examId: string,
  onExamClosed: () => void,
): Promise<void> {
  try {
    const status = await checkExamStatus(examId);
    if (
      status.status === "closed" ||
      status.attempt?.status === "submitted"
    ) {
      onExamClosed();
    }
  } catch {
    // ignore
  }
}

export function useRealtimeSync({
  examId,
  attemptId,
  serverDrift,
  onExamClosed,
  onTimeExtended,
}: UseRealtimeSyncOptions) {
  const supabase = createClient();
  const submittedRef = useRef(false);

  const safeOnExamClosed = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    toast.info("Exam has been ended by admin. Your answers were submitted automatically.");
    onExamClosed();
  };

  useEffect(() => {
    if (!attemptId) return;

    const attemptChannel = supabase
      .channel(`attempt-realtime-${attemptId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "attempts",
          filter: `id=eq.${attemptId}`,
        },
        (payload) => {
          if (payload.new.status === "submitted") {
            safeOnExamClosed();
            return;
          }
          const newDueAt = payload.new.server_due_at;
          if (newDueAt) {
            const dueAtMs = new Date(newDueAt).getTime();
            const nowMs = Date.now() + serverDrift;
            const remaining = Math.max(0, Math.floor((dueAtMs - nowMs) / 1000));
            onTimeExtended(remaining);
          }
        }
      )
      .subscribe();

    const examChannel = supabase
      .channel(`exam-realtime-global-${examId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exams",
          filter: `id=eq.${examId}`,
        },
        (payload) => {
          if (payload.new.status === "closed") {
            safeOnExamClosed();
          } else {
            const newClosesAt = payload.new.closes_at;
            if (newClosesAt) {
              const dueAtMs = new Date(newClosesAt).getTime();
              const nowMs = Date.now() + serverDrift;
              const remaining = Math.max(0, Math.floor((dueAtMs - nowMs) / 1000));
              onTimeExtended(remaining);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "exams",
          filter: `id=eq.${examId}`,
        },
        () => {
          toast.error("This exam is no longer available.");
        }
      )
      .subscribe();

    // Polling fallback: check exam status periodically
    const pollId = setInterval(() => {
      checkAndHandleClosed(examId, safeOnExamClosed);
    }, POLL_INTERVAL_MS);

    // Also check when the user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !submittedRef.current) {
        checkAndHandleClosed(examId, safeOnExamClosed);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(attemptChannel);
      supabase.removeChannel(examChannel);
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId, examId, serverDrift, onExamClosed, onTimeExtended, supabase]);
}