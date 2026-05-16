"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  hasActiveExamNavigationIntent,
  markExamNavigationIntent,
} from "@/lib/exam-navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEFAULT_EXAM_CONTROLS, type ExamControls } from "@/lib/exam-controls";
import type {
  Question,
  AnswerState,
  ApiExamQuestion,
  ExistingAnswer,
  ChallengeMode,
} from "@/lib/quizTypes";
import { shuffleArray } from "@/lib/utils/random";

import { QuestionDisplay } from "./QuestionDisplay";
import { QuestionNavigator } from "./QuestionNavigator";
import { ProctoringModals } from "./ProctoringModals";
import { toast } from "react-toastify";

import "@/app/exam-editor.css";

export function TakeExamContent({ examId }: { examId: string }) {
  const searchParams = useSearchParams();
  const startQuestionId = searchParams.get("q");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [serverDrift, setServerDrift] = useState(0); // diff between server and local clock
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [controls, setControls] = useState<ExamControls>(DEFAULT_EXAM_CONTROLS);
  const attemptIdRef = useRef<string | null>(null);

  const [showNav, setShowNav] = useState(true);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Idempotent guard for auto-submit
  const submittingRef = useRef(false);
  // Reconciliation polling ref
  const reconciliationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smart Navigation: Jump to specific question when query param 'q' changes
  useEffect(() => {
    if (startQuestionId && questions.length > 0) {
      const index = questions.findIndex((q) => q.id === startQuestionId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [startQuestionId, questions]);

  // Proctoring: Detect Tab Switch
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (hasActiveExamNavigationIntent()) {
        return;
      }

      if (document.hidden && attemptId && !loading) {
        if (controls.tabSwitchWarningEnabled) {
          setShowTabWarning(true);
        }

        if (controls.proctoringEnabled) {
          try {
            await fetch(`/api/exam/${examId}/proctor`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
          } catch (err) {
            console.error("Failed to report proctoring event:", err);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    attemptId,
    controls.proctoringEnabled,
    controls.tabSwitchWarningEnabled,
    examId,
    loading,
  ]);

  // Proctoring: Prevent right click and clipboard actions when enabled.
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleClipboard = (e: ClipboardEvent) => e.preventDefault();

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
  }, [controls.copyPasteBlocked, controls.rightClickBlocked]);

  // Realtime subscription for time extensions
  useEffect(() => {
    if (!attemptId) return;
    const supabase = createClient();

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
            toast.info("Exam has been ended by admin. Your answers were submitted automatically.");
            handleAutoSubmit(1000);
            return;
          }
          const newDueAt = payload.new.server_due_at;
          if (newDueAt) {
            const dueAtMs = new Date(newDueAt).getTime();
            const nowMs = Date.now() + serverDrift;
            const remaining = Math.max(0, Math.floor((dueAtMs - nowMs) / 1000));
            setTimeLeft(remaining);
            console.log(
              "⏰ Time extended (Personal)! New remaining:",
              remaining,
            );
          }
        },
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
            toast.info("Exam has been ended by admin. Your answers were submitted automatically.");
            handleAutoSubmit(1000); // Wait 1s for any pending saves to flush
          } else {
            const newClosesAt = payload.new.closes_at;
            if (newClosesAt) {
              const dueAtMs = new Date(newClosesAt).getTime();
              const nowMs = Date.now() + serverDrift;
              const remaining = Math.max(0, Math.floor((dueAtMs - nowMs) / 1000));
              setTimeLeft(remaining);
              console.log("🌍 Time extended (Global)! New remaining:", remaining);
            }
          }
        },
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
          router.push("/exam/join");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptChannel);
      supabase.removeChannel(examChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, examId, serverDrift]);

  // Reconciliation polling loop for local mode / missed realtime events
  useEffect(() => {
    if (!attemptId || loading) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/exam/${examId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        // React to exam closed status
        if (data.status === "closed" || data.status === "ended") {
          toast.info("Exam has been ended by admin. Your answers were submitted automatically.");
          handleAutoSubmit(1500);
          return;
        }

        // React to attempt submitted status (e.g., kicked)
        if (data.attempt?.status === "submitted") {
          markExamNavigationIntent();
          router.push(`/exam/${examId}/submitted`);
        }
      } catch {
        // ignore - polling fallback, only triggers on realtime miss
      }
    };

    // Poll every 3 seconds while active
    reconciliationIntervalRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (reconciliationIntervalRef.current) {
        clearInterval(reconciliationIntervalRef.current);
        reconciliationIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, examId, loading]);

  // Full screen management
  const enterFullScreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullScreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      try {
        const res = await fetch(`/api/exam/${examId}/take-init`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
          } else if (res.status === 404) {
            toast.error("This exam is no longer available.");
            router.push("/exam/join");
          }
          return;
        }

        const data = await res.json();
        const {
          attempt,
          questions: examQuestions,
          answers: existingAnswers,
          serverNow,
          controls: loadedControls,
        } = data;

        if (attempt.status === "submitted") {
          router.push(`/exam/${examId}/submitted`);
          return;
        }

        setAttemptId(attempt.id);
        attemptIdRef.current = attempt.id;
        if (loadedControls) {
          setControls(loadedControls);
        }

        setServerDrift(serverNow - Date.now());

        const dueAt = new Date(attempt.server_due_at).getTime();
        const remaining = Math.max(0, Math.floor((dueAt - serverNow) / 1000));
        setTimeLeft(remaining);

        if (examQuestions && examQuestions.length > 0) {
          const enriched: Question[] = (examQuestions as ApiExamQuestion[]).map(
            (eq) => ({
              ...eq,
              options:
                typeof eq.options === "string"
                  ? JSON.parse(eq.options)
                  : eq.options || [],
              question_type: eq.question_type || "theory",
              questionType: eq.question_type || "theory",
              codeSnippet: eq.code_snippet || undefined,
              starterCode: eq.starter_code || undefined,
              functionName: eq.function_name || undefined,
              challengeMode: (eq.challenge_mode as ChallengeMode) || undefined,
              testCases: eq.test_cases || undefined,
              language: eq.language || undefined,
            }),
          );

          const shuffled = shuffleArray(enriched, attempt.id);
          setQuestions(shuffled);
        } else {
          console.error("No questions found for this exam");
        }

        if (existingAnswers) {
          const answerMap: Record<string, AnswerState> = {};
          (existingAnswers as ExistingAnswer[]).forEach((a) => {
            answerMap[a.question_id] = {
              selected_option_id: a.selected_option_id,
              is_bookmarked: a.is_bookmarked,
              is_skipped: a.is_skipped,
              code_answer: a.code_answer || undefined,
              last_run_results: a.last_run_results || undefined,
              test_pass_count: a.test_pass_count || 0,
              test_fail_count: a.test_fail_count || 0,
            };
          });
          setAnswers(answerMap);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load exam:", err);
      }
    };

    loadExam();
  }, [examId, router]);

  const handleAutoSubmit = useCallback(async (delayMs: number = 0) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Clear pending debounced saves - they will be lost but that's acceptable
    // The important thing is to not block submission with more saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const id = attemptIdRef.current;
    if (!id) return;
    try {
      await fetch(`/api/exam/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: id }),
      });
    } catch {
      // ignore
    }
    markExamNavigationIntent();
    router.push(`/exam/${examId}/submitted`);
  }, [examId, router]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit(1000); // 1s grace for saves
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null]);

  const saveAnswer = useCallback(
    (questionId: string, state: AnswerState) => {
      if (!attemptId) return;

      setSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        await fetch(`/api/exam/${examId}/answer`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            questionId,
            ...state,
          }),
        });
        setSaving(false);
      }, 500);
    },
    [attemptId, examId],
  );

  const selectOption = (questionId: string, optionId: string) => {
    const newState: AnswerState = {
      ...(answers[questionId] || {
        selected_option_id: null,
        is_bookmarked: false,
        is_skipped: false,
      }),
      selected_option_id: optionId,
      is_skipped: false,
    };
    setAnswers((prev) => ({ ...prev, [questionId]: newState }));
    saveAnswer(questionId, newState);
  };

  const clearAnswer = (questionId: string) => {
    const newState: AnswerState = {
      ...(answers[questionId] || {
        selected_option_id: null,
        is_bookmarked: false,
        is_skipped: false,
      }),
      selected_option_id: null,
    };
    setAnswers((prev) => ({ ...prev, [questionId]: newState }));
    saveAnswer(questionId, newState);
  };

  const toggleBookmark = (questionId: string) => {
    const current = answers[questionId] || {
      selected_option_id: null,
      is_bookmarked: false,
      is_skipped: false,
    };
    const newState: AnswerState = {
      ...current,
      is_bookmarked: !current.is_bookmarked,
    };
    setAnswers((prev) => ({ ...prev, [questionId]: newState }));
    saveAnswer(questionId, newState);
  };

  const skipQuestion = (questionId: string) => {
    const current = answers[questionId] || {
      selected_option_id: null,
      is_bookmarked: false,
      is_skipped: false,
    };
    if (!current.selected_option_id) {
      const newState: AnswerState = { ...current, is_skipped: true };
      setAnswers((prev) => ({ ...prev, [questionId]: newState }));
      saveAnswer(questionId, newState);
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      markExamNavigationIntent();
      router.push(`/exam/${examId}/review`);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const saveCodeAnswer = useCallback(
    (questionId: string, code: string) => {
      if (!attemptId) return;
      const current = answers[questionId] || {
        selected_option_id: null,
        is_bookmarked: false,
        is_skipped: false,
      };
      const newState: AnswerState = { ...current, code_answer: code };
      setAnswers((prev) => ({ ...prev, [questionId]: newState }));
      fetch(`/api/exam/${examId}/answer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          code_answer: code,
          code_language: "javascript",
        }),
      }).catch(console.error);
    },
    [attemptId, answers, examId],
  );

  // Auto-collapse sidebar for programming questions
  useEffect(() => {
    if (!loading && questions[currentIndex]) {
      const isCoding = questions[currentIndex].questionType === "programming";
      if (isCoding) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
    }
  }, [currentIndex, questions, loading]);

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="screen-loader-content">
          <div
            className="spinner mx-auto mb-4"
            style={{ width: 40, height: 40 }}
          />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            No Questions Found
          </h2>
          <p className="text-muted-foreground mb-8">
            This exam doesn&apos;t seem to have any questions assigned yet.
            Please contact the administrator.
          </p>
          <button
            onClick={() => router.push("/exam/join")}
            className="w-full py-3 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary-hover transition-colors duration-150"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.id];
  const isUrgent = timeLeft !== null && timeLeft < 300;

  const answeredCount = Object.values(answers).filter(
    (a) => a.selected_option_id || a.code_answer?.trim(),
  ).length;

  const isProgrammingQuestion = currentQuestion.questionType === "programming";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 px-4 h-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">
                Question
              </span>
              <span className="text-lg font-bold text-foreground leading-none">
                {currentIndex + 1} <span className="text-muted-foreground font-medium text-sm">/ {questions.length}</span>
              </span>
            </div>
            <div className="h-8 w-px bg-border/50 mx-1" />
            <div className="flex items-center gap-2">
              <span className="badge badge-default">
                {currentQuestion.topic}
              </span>
              <span
                className={`badge ${
                  currentQuestion.difficulty === "Intermediate"
                    ? "badge-warning"
                    : currentQuestion.difficulty === "Advanced"
                    ? "badge-danger"
                    : "badge-success"
                }`}
              >
                {currentQuestion.difficulty}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-muted-foreground">
              {saving && (
                <span className="flex items-center gap-1.5 animate-pulse">
                  <div className="spinner" style={{ width: 12, height: 12 }} />
                  Saving
                </span>
              ) || (
                <span className="flex items-center gap-1.5 text-success">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              <div className="w-px h-4 bg-border/50" />
              <span>{answeredCount} answered</span>
            </div>

            {timeLeft !== null && (
              <div
                className={`px-4 py-1.5 rounded-lg font-mono font-bold text-lg transition-colors border ${
                  isUrgent
                    ? "bg-danger-muted text-danger border-danger/20"
                    : "bg-background-secondary text-foreground border-border"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            )}
            {controls.themeToggleEnabled && (
              <div className="border-l border-border/50 pl-4 hidden md:block">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto transition-all duration-300">
          <QuestionDisplay
            currentQuestion={currentQuestion}
            currentAnswer={currentAnswer}
            isProgrammingQuestion={isProgrammingQuestion}
            examId={examId}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            selectOption={selectOption}
            clearAnswer={clearAnswer}
            toggleBookmark={toggleBookmark}
            skipQuestion={skipQuestion}
            setCurrentIndex={setCurrentIndex}
            saveCodeAnswer={saveCodeAnswer}
            controls={controls}
            isNavCollapsed={!showNav}
          />
        </main>

        {controls.questionNavigatorEnabled && (
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
              showNav ? "w-full lg:w-72" : "w-0"
            }`}
          >
            <QuestionNavigator
              questions={questions}
              answers={answers}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              showNav={showNav}
              setShowNav={setShowNav}
              examId={examId}
            />
          </div>
        )}
      </div>

      <ProctoringModals
        showTabWarning={controls.tabSwitchWarningEnabled && showTabWarning}
        setShowTabWarning={setShowTabWarning}
        isFullScreen={isFullScreen}
        loading={loading}
        fullscreenRequired={controls.fullscreenRequired}
        enterFullScreen={enterFullScreen}
      />
    </div>
  );
}
