"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QuestionDisplay } from "@/components/TakeExam/QuestionDisplay";
import { QuestionNavigator } from "@/components/TakeExam/QuestionNavigator";
import { ProctoringModals } from "@/components/TakeExam/ProctoringModals";
import { toast } from "react-toastify";
import { markExamNavigationIntent } from "@/lib/exam-navigation";
import type { Question, AnswerState } from "@/types";
import type { ExamControls } from "@/lib/exam-controls";

import {
  useExamSession,
  useAnswerState,
  useAutosaveAnswers,
  useProctoring,
  useRealtimeSync,
} from "../hooks";
import { submitExam, saveBulkAnswers } from "../services/examApi";
import { TimerDisplay } from "./TimerDisplay";

import "@/app/exam-editor.css";

interface ExamContainerProps {
  examId: string;
}

export function ExamContainer({ examId }: ExamContainerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const startQuestionId = searchParams.get("q");

  const {
    questions,
    answers,
    setAnswers,
    attemptId,
    controls,
    loading,
    error,
    serverDrift,
    initialTimeLeft,
  } = useExamSession(examId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showNav, setShowNav] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const attemptIdRef = useRef(attemptId);
  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const getLocalStorageKey = useCallback(() => {
    const id = attemptIdRef.current;
    return id ? `exam_${examId}_${id}_answers` : null;
  }, [examId]);

  const {
    saveAnswer,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    flushQueue,
    isPending,
  } = useAutosaveAnswers({
    examId,
    attemptId,
    getLocalStorageKey,
  });

  useEffect(() => {
    const localBackup = loadFromLocalStorage();
    if (localBackup && Object.keys(localBackup).length > 0) {
      setAnswers((prev) => {
        const merged = { ...prev };
        for (const [qId, state] of Object.entries(localBackup)) {
          if (!merged[qId]) {
            merged[qId] = state;
          }
        }
        return merged;
      });
    }
  }, [loadFromLocalStorage, setAnswers]);

  const handleAutoSubmit = useCallback(async (delayMs: number = 0) => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const id = attemptIdRef.current;
    if (!id) return;

    await flushQueue();

    clearLocalStorage();

    const allAnswers = answersRef.current;
    try {
      await saveBulkAnswers(examId, id, allAnswers);
      await submitExam(examId, id);
    } catch {
      /* ignore */
    }
    markExamNavigationIntent();
    router.push(`/exam/${examId}/submitted`);
  }, [examId, router, clearLocalStorage, flushQueue]);

  const handleNavigateToReview = useCallback(async () => {
    await flushQueue();
    markExamNavigationIntent();
    router.push(`/exam/${examId}/review`);
  }, [examId, router, flushQueue]);

  const handleTimeUp = useCallback(() => {
    handleAutoSubmit(1000);
  }, [handleAutoSubmit]);

  useEffect(() => {
    if (initialTimeLeft !== null) {
      setTimeLeft(initialTimeLeft);
    }
  }, [initialTimeLeft]);

  const { showTabWarning, setShowTabWarning } = useProctoring({
    examId,
    attemptId,
    controls,
    loading,
  });

  useRealtimeSync({
    examId,
    attemptId,
    serverDrift,
    onExamClosed: () => handleAutoSubmit(1000),
    onTimeExtended: (newTime) => setTimeLeft(newTime),
  });

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  useEffect(() => {
    if (!loading && questions[currentIndex]) {
      const isCoding = questions[currentIndex].questionType === "programming";
      setShowNav(!isCoding);
    }
  }, [currentIndex, questions, loading]);

  const enterFullScreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }, []);

  const {
    selectOption,
    clearAnswer,
    toggleBookmark,
    skipQuestion,
    saveCodeAnswer,
    getAnsweredCount,
  } = useAnswerState({
    answers,
    setAnswers,
    saveAnswer,
    examId,
    attemptId,
  });

  useEffect(() => {
    if (startQuestionId && questions.length > 0) {
      const index = questions.findIndex((q) => q.id === startQuestionId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [startQuestionId, questions]);

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="screen-loader-content">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {error ? "Error" : "No Questions Found"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {error || "This exam doesn't seem to have any questions assigned yet."}
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
  const currentAnswer = answers[currentQuestion.id];
  const isProgrammingQuestion = currentQuestion.questionType === "programming";
  const answeredCount = getAnsweredCount();

  return (
    <div className="min-h-screen flex flex-col">
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
              <span className="badge badge-default">{currentQuestion.topic}</span>
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
              {isPending ? (
                <span className="flex items-center gap-1.5 animate-pulse">
                  <div className="spinner" style={{ width: 12, height: 12 }} />
                  Saving
                </span>
              ) : (
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

            <TimerDisplay initialTime={timeLeft || 0} onTimeUp={handleTimeUp} />

            {controls.themeToggleEnabled && (
              <div className="border-l border-border/50 pl-4 hidden md:block">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
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
            skipQuestion={(qId) =>
              skipQuestion(
                qId,
                currentIndex < questions.length - 1,
                () => setCurrentIndex(currentIndex + 1),
                handleNavigateToReview
              )
            }
            setCurrentIndex={setCurrentIndex}
            saveCodeAnswer={saveCodeAnswer}
            controls={controls}
            isNavCollapsed={!showNav}
            onNavigateToReview={handleNavigateToReview}
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
