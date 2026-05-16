"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import {
  hasActiveExamNavigationIntent,
  markExamNavigationIntent,
} from "@/lib/exam-navigation";
import { DEFAULT_EXAM_CONTROLS, type ExamControls } from "@/lib/exam-controls";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface AnswerState {
  question_id: string;
  selected_option_id: string | null;
  is_bookmarked: boolean;
  is_skipped: boolean;
  code_answer?: string | null;
  test_pass_count?: number;
  test_fail_count?: number;
}

interface Question {
  id: string;
  topic: string;
  question: string;
  position: number;
}

export default function ReviewExam({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isOpeningConfirm, setIsOpeningConfirm] = useState(false);
  const [navigatingToQuestion, setNavigatingToQuestion] = useState<
    string | null
  >(null);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [serverDrift, setServerDrift] = useState(0); // diff between server and local clock
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ExamControls>(DEFAULT_EXAM_CONTROLS);
  const [filter, setFilter] = useState<"all" | "answered" | "skipped" | "bookmarked" | "unanswered">("all");
  const router = useRouter();

  // Idempotent guard for submit
  const submittingRef = useRef(false);
  // Reconciliation polling ref
  const reconciliationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Proctoring: Detect Tab Switch
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (hasActiveExamNavigationIntent()) {
        return;
      }

      if (attemptId && document.hidden && !loading) {
        if (controls.tabSwitchWarningEnabled) {
          setShowTabWarning(true);
        }

        if (controls.proctoringEnabled) {
          try {
            await fetch(`/api/exam/${examId}/proctor`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attemptId }),
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

    const channel = supabase
      .channel(`attempt-updates-review-${attemptId}`)
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
            toast.info("Exam has been ended by admin. Submitting your work.");
            handleSubmit();
            return;
          }
          const newDueAt = payload.new.server_due_at;
          if (newDueAt) {
            const dueAtMs = new Date(newDueAt).getTime();
            const nowMs = Date.now() + serverDrift;
            const remaining = Math.max(0, Math.floor((dueAtMs - nowMs) / 1000));
            setTimeLeft(remaining);
            console.log(
              "Time extended (Review Page)! New remaining:",
              remaining,
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "exams", filter: `id=eq.${examId}` },
        (payload) => {
          if (payload.new.status === "closed") {
            toast.info("Exam has been ended by admin. Submitting your work.");
            handleSubmit();
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
          router.push("/exam/join");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, serverDrift, examId]);

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
          toast.info("Exam has been ended by admin. Submitting your work.");
          handleSubmit();
          return;
        }

        // React to attempt submitted status (e.g., kicked)
        if (data.attempt?.status === "submitted") {
          markExamNavigationIntent();
          router.push(`/exam/${examId}/submitted`);
        }
      } catch {
        // ignore - polling fallback
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/exam/${examId}/review-init`);
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
          answers: ans,
          serverNow,
          controls: loadedControls,
        } = data;

        if (attempt.status === "submitted") {
          return router.push(`/exam/${examId}/submitted`);
        }
        setAttemptId(attempt.id);
        if (loadedControls) {
          setControls(loadedControls);
        }

        setServerDrift(serverNow - Date.now());

        const dueAt = new Date(attempt.server_due_at).getTime();
        const remaining = Math.max(0, Math.floor((dueAt - serverNow) / 1000));
        setTimeLeft(remaining);

        if (examQuestions) setQuestions(examQuestions);
        if (ans) setAnswers(ans);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load review data:", err);
      }
    };
    loadData();
  }, [examId, router]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null]);

  const handleBackToExam = () => {
    setIsNavigatingBack(true);
    markExamNavigationIntent();
    router.push(`/exam/${examId}/take`);
  };

  const handleGoToQuestion = (questionId: string) => {
    setNavigatingToQuestion(questionId);
    markExamNavigationIntent();
    router.push(`/exam/${examId}/take?q=${questionId}`);
  };

  const handleOpenConfirm = () => {
    setIsOpeningConfirm(true);
    // Brief delay to show interaction before modal pops
    setTimeout(() => {
      setShowConfirm(true);
      setIsOpeningConfirm(false);
    }, 150);
  };

  const handleSubmit = async () => {
    if (!attemptId || submitting || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await fetch(`/api/exam/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      markExamNavigationIntent();
      router.push(`/exam/${examId}/submitted`);
    } catch {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const answerMap = new Map(answers.map((a) => [a.question_id, a]));

  const answered = questions.filter((q) => {
    const a = answerMap.get(q.id);
    return a?.selected_option_id || a?.code_answer?.trim();
  });
  const skipped = controls.skipEnabled
    ? questions.filter((q) => {
        const a = answerMap.get(q.id);
        return (
          a?.is_skipped && !a?.selected_option_id && !a?.code_answer?.trim()
        );
      })
    : [];
  const bookmarked = controls.bookmarksEnabled
    ? questions.filter((q) => answerMap.get(q.id)?.is_bookmarked)
    : [];
  const unanswered = questions.filter((q) => {
    const a = answerMap.get(q.id);
    return (
      !a?.selected_option_id &&
      !a?.code_answer?.trim() &&
      (!controls.skipEnabled || !a?.is_skipped)
    );
  });

  const isUrgent = timeLeft !== null && timeLeft < 300;

  const IconCheck = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
  const IconSkip = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
      />
    </svg>
  );
  const IconBookmark = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
  const IconQuestion = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass border-b border-border shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              Review & Submit
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Verify your answers before final submission
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden xs:flex items-center gap-2">
              {controls.themeToggleEnabled && <ThemeToggle />}
              {timeLeft !== null && (
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-md font-mono font-bold text-sm border transition-colors ${
                    isUrgent
                      ? "bg-danger/10 text-danger border-danger/20 animate-pulse"
                      : "bg-muted text-foreground border-border"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToExam}
                disabled={isNavigatingBack || submitting || isOpeningConfirm || navigatingToQuestion !== null}
                className="btn-secondary h-9 px-3 sm:px-4 text-xs sm:text-sm"
              >
                {isNavigatingBack ? (
                  <div className="spinner !w-3.5 !h-3.5" />
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden xs:inline">Back to Exam</span>
                    <span className="xs:hidden">Back</span>
                  </>
                )}
              </button>
              <button
                onClick={handleOpenConfirm}
                disabled={isOpeningConfirm || submitting || isNavigatingBack || navigatingToQuestion !== null}
                className="btn-primary h-9 px-3 sm:px-4 text-xs sm:text-sm bg-accent hover:bg-accent-hover text-white border-none shadow-md"
              >
                {isOpeningConfirm ? (
                  <div className="spinner !w-3.5 !h-3.5 !border-t-white" />
                ) : (
                  <>
                    <span className="hidden xs:inline">Submit Exam</span>
                    <span className="xs:hidden">Submit</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-8">
        {/* Responsive Filters */}
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-muted/30 rounded-2xl border border-border w-full">
          {[
            { id: "all", label: "All", count: questions.length, icon: null },
            { id: "answered", label: "Answered", count: answered.length, icon: IconCheck },
            ...(controls.skipEnabled ? [{ id: "skipped", label: "Skipped", count: skipped.length, icon: IconSkip }] : []),
            ...(controls.bookmarksEnabled ? [{ id: "bookmarked", label: "Bookmarked", count: bookmarked.length, icon: IconBookmark }] : []),
            { id: "unanswered", label: "Unanswered", count: unanswered.length, icon: IconQuestion },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                filter === item.id
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              {item.icon && (
                <span className={`shrink-0 ${
                  filter === item.id ? "text-accent" : "text-muted-foreground/60"
                }`}>
                  <item.icon />
                </span>
              )}
              <span className="truncate">{item.label}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] ${
                filter === item.id ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground/60"
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {unanswered.length > 0 && filter === "all" && (
          <div className="mb-8 animate-fade-in">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20 text-warning">
              <div className="mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Incomplete Assessment</p>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                  You have {unanswered.length} unanswered question{unanswered.length !== 1 ? "s" : ""}. 
                  We recommend reviewing these before final submission to maximize your score.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-10 pb-20">
          {[
            { id: "answered", title: "Answered Questions", items: answered, color: "text-success", indicator: "bg-success", Icon: IconCheck },
            ...(controls.skipEnabled ? [{ id: "skipped", title: "Skipped Questions", items: skipped, color: "text-warning", indicator: "bg-warning", Icon: IconSkip }] : []),
            ...(controls.bookmarksEnabled ? [{ id: "bookmarked", title: "Bookmarked Items", items: bookmarked, color: "text-accent", indicator: "bg-accent", Icon: IconBookmark }] : []),
            { id: "unanswered", title: "Unanswered Questions", items: unanswered, color: "text-muted-foreground", indicator: "bg-border", Icon: IconQuestion },
          ]
            .filter(({ id, items }) => items.length > 0 && (filter === "all" || filter === id))
            .map(({ title, items, color, indicator, Icon }) => (
              <section key={title} className="animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-1.5 h-1.5 rounded-full ${indicator}`} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {title} <span className="ml-1 opacity-60 font-medium">({items.length})</span>
                  </h3>
                </div>
                
                <div className="grid gap-2">
                  {items.map((q) => (
                    <button
                      key={q.id}
                      disabled={navigatingToQuestion !== null || isNavigatingBack || submitting || isOpeningConfirm}
                      onClick={() => handleGoToQuestion(q.id)}
                      className="group w-full text-left p-4 rounded-xl bg-card border border-border hover:border-accent/30 hover:bg-accent/[0.02] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-8 h-8 mt-0.5 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                          {questions.indexOf(q) + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium whitespace-normal break-words leading-relaxed group-hover:text-accent transition-colors" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                            {q.question}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">
                            {q.topic}
                          </p>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-3 mt-0.5">
                        {navigatingToQuestion === q.id ? (
                          <div className="spinner !w-3.5 !h-3.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10 text-accent">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          
          {(filter !== "all" && [
            { id: "answered", items: answered },
            { id: "skipped", items: skipped },
            { id: "bookmarked", items: bookmarked },
            { id: "unanswered", items: unanswered },
          ].find(f => f.id === filter)?.items.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground/40">
                <IconQuestion />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No questions found</h3>
              <p className="text-xs text-muted-foreground mt-1">There are no questions matching this filter.</p>
              <button 
                onClick={() => setFilter("all")}
                className="mt-6 text-xs font-bold text-accent hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Tab Switch Warning Modal */}
      {controls.tabSwitchWarningEnabled && showTabWarning && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-8 max-w-md w-full text-center border-danger/30 shadow-2xl animate-scale-in">
            <div className="w-20 h-20 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Proctoring Alert</h2>
            <p className="text-danger font-semibold mb-3">Potential Academic Dishonesty Detected</p>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              Our system detected a tab switch or window blur event. This activity has been logged and reported. 
              Please maintain focus on the exam environment.
            </p>
            <button
              onClick={() => setShowTabWarning(false)}
              className="w-full py-3.5 rounded-xl bg-danger text-white font-bold text-sm hover:bg-danger/90 active:scale-95 transition-all shadow-lg"
            >
              I Understand & Will Comply
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[100] modal-overlay">
          <div className="modal-content max-w-md p-8">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Submit Assessment?
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              You have answered <span className="font-bold text-foreground">{answered.length}</span> of <span className="font-bold text-foreground">{questions.length}</span> questions. 
              Once submitted, you will not be able to modify your responses.
            </p>
            {unanswered.length > 0 && (
              <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-warning text-[13px] mb-8 flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p>
                  <span className="font-bold">{unanswered.length}</span> question{unanswered.length !== 1 ? "s" : ""} will be marked as unanswered. 
                  This will significantly impact your final score.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 btn-secondary h-11 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 btn-primary h-11 rounded-xl bg-accent hover:bg-accent-hover text-white shadow-lg"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="spinner !w-4 !h-4 !border-t-white" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  "Yes, Submit Now"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
