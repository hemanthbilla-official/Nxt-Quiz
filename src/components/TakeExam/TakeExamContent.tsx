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
          const newClosesAt = payload.new.closes_at;
          if (newClosesAt) {
            const dueAtMs = new Date(newClosesAt).getTime();
            const nowMs = Date.now() + serverDrift;
            const remaining = Math.max(0, Math.floor((dueAtMs - nowMs) / 1000));
            setTimeLeft(remaining);
            console.log("🌍 Time extended (Global)! New remaining:", remaining);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptChannel);
      supabase.removeChannel(examChannel);
    };
  }, [attemptId, examId, serverDrift]);

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

  const handleAutoSubmit = useCallback(async () => {
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
          handleAutoSubmit();
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

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="screen-loader-content animate-fade-in">
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
        <div className="glass-card p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            No Questions Found
          </h2>
          <p className="text-muted-foreground mb-8">
            This exam doesn&apos;t seem to have any questions assigned yet.
            Please contact the administrator.
          </p>
          <button
            onClick={() => router.push("/exam/join")}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold"
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
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              Q {currentIndex + 1}/{questions.length}
            </span>
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-border/50">
              {currentQuestion.topic}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-lg ${
                currentQuestion.difficulty === "Intermediate"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
              }`}
            >
              {currentQuestion.difficulty}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {saving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="spinner" style={{ width: 12, height: 12 }} />
                Saving
              </span>
            )}
            {controls.themeToggleEnabled && <ThemeToggle />}
            <span className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </span>
            {timeLeft !== null && (
              <div
                className={`px-4 py-2 rounded-xl font-mono font-bold text-lg ${
                  isUrgent
                    ? "bg-danger/10 text-danger animate-timer-urgent"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
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
          />
        </main>

        {controls.questionNavigatorEnabled && (
          <QuestionNavigator
            questions={questions}
            answers={answers}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            showNav={showNav}
            setShowNav={setShowNav}
            examId={examId}
          />
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
