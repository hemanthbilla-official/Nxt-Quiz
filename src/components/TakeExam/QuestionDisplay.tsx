"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Question, AnswerState } from "@/lib/quizTypes";
import type { ExamControls } from "@/lib/exam-controls";
import { markExamNavigationIntent } from "@/lib/exam-navigation";
import MarkdownViewer from "@/components/Common/MarkdownViewer";

const ProgrammingQuestion = dynamic(
  () => import("@/components/CodeEditor/ProgrammingQuestion"),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">
        Loading editor...
      </div>
    ),
  },
);

interface QuestionDisplayProps {
  currentQuestion: Question;
  currentAnswer?: AnswerState;
  isProgrammingQuestion: boolean;
  examId: string;
  currentIndex: number;
  totalQuestions: number;
  selectOption: (qId: string, optionId: string) => void;
  clearAnswer: (qId: string) => void;
  toggleBookmark: (qId: string) => void;
  skipQuestion: (qId: string) => void;
  setCurrentIndex: (index: number) => void;
  saveCodeAnswer: (qId: string, code: string) => void;
  controls: ExamControls;
}

export function QuestionDisplay({
  currentQuestion,
  currentAnswer,
  isProgrammingQuestion,
  examId,
  currentIndex,
  totalQuestions,
  selectOption,
  clearAnswer,
  toggleBookmark,
  skipQuestion,
  setCurrentIndex,
  saveCodeAnswer,
  controls,
}: QuestionDisplayProps) {
  const router = useRouter();
  const [leftWidth, setLeftWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  // Draggable Split Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(300, Math.min(window.innerWidth * 0.6, startWidth + deltaX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className={`${
        isProgrammingQuestion ? "max-w-full px-2" : "max-w-3xl mx-auto"
      } animate-fade-in`}
      key={currentIndex}
    >
      {isProgrammingQuestion ? (
        /* Unified 2-Column Resizable Split Layout */
        <div 
          className={`flex flex-col lg:flex-row gap-0 h-[calc(100vh-8rem)] min-h-[650px] relative border border-border rounded-xl shadow-sm overflow-hidden bg-card ${isResizing ? "cursor-col-resize select-none" : ""}`}
        >
          {/* Left Column: Problem Description */}
          <div 
            style={{ width: `${leftWidth}px` }}
            className="flex-shrink-0 flex flex-col bg-card border-r border-border overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-border bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Problem Description
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                  {currentQuestion.topic}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth">
              <MarkdownViewer content={currentQuestion.question} />
              
              {currentQuestion.codeSnippet && (
                <div className="mt-12 pt-8 border-t border-border/50">
                  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Reference Instructions
                  </div>
                  <div className="p-5 rounded-xl border border-border bg-muted/20 text-sm leading-relaxed text-foreground/80 font-medium">
                    {currentQuestion.codeSnippet}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resize Handle Divider */}
          <div
            onMouseDown={handleMouseDown}
            className={`hidden lg:flex w-1.5 z-10 group cursor-col-resize items-center justify-center transition-colors hover:bg-primary/20 ${isResizing ? "bg-primary/30" : "bg-muted/5"}`}
            title="Drag to resize"
          >
            <div className={`w-[1px] h-full transition-colors ${isResizing ? "bg-primary" : "bg-transparent group-hover:bg-primary/50"}`} />
          </div>

          {/* Right Column: Code Editor */}
          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
            <ProgrammingQuestion
              className="pe-connected"
              questionId={currentQuestion.id}
              challengeMode={currentQuestion.challengeMode || "function"}
              starterCode={currentQuestion.starterCode || ""}
              testCases={currentQuestion.testCases || []}
              savedCode={currentAnswer?.code_answer}
              onCodeChange={(code) => saveCodeAnswer(currentQuestion.id, code)}
              examId={examId}
              controls={controls}
            />
          </div>
        </div>
      ) : (
        /* Standard Layout for MCQs */
        <>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-primary rounded-full" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/80">
                Question
              </span>
            </div>
            <MarkdownViewer content={currentQuestion.question} className="text-lg font-medium" />
          </div>

          {currentQuestion.codeSnippet && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reference Code
                </span>
              </div>
              <pre className="code-block p-4 rounded-xl border border-border bg-muted/30 overflow-x-auto">
                <code className="text-sm font-mono">{currentQuestion.codeSnippet}</code>
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected =
                currentAnswer?.selected_option_id === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => selectOption(currentQuestion.id, option.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-card hover:border-border-hover hover:bg-card-hover text-muted-foreground"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                        isSelected
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "bg-border/50 text-muted-foreground"
                      }`}
                    >
                      {option.id}
                    </span>
                    <span className="pt-1 text-sm leading-relaxed">
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Common Action buttons */}
      <div className={`flex flex-col gap-4 mt-8 pt-6 border-t border-border lg:flex-row lg:items-center lg:justify-between ${isProgrammingQuestion ? "max-w-full" : ""}`}>
        <div className="flex flex-wrap items-center gap-3">
          {controls.bookmarksEnabled && (
            <button
              onClick={() => toggleBookmark(currentQuestion.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                currentAnswer?.is_bookmarked
                  ? "bg-secondary/15 text-secondary border border-secondary/30"
                  : "bg-card border border-border text-muted-foreground hover:border-border-hover"
              }`}
            >
              <span className="flex items-center gap-1.5">
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
                {currentAnswer?.is_bookmarked ? "Bookmarked" : "Bookmark"}
              </span>
            </button>
          )}
          {controls.skipEnabled && (
            <button
              onClick={() => skipQuestion(currentQuestion.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-card border border-border text-muted-foreground hover:border-border-hover transition-all"
            >
              <span className="flex items-center gap-1.5">
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
                Skip
              </span>
            </button>
          )}
          {controls.clearAnswerEnabled && currentAnswer?.selected_option_id && (
            <button
              onClick={() => clearAnswer(currentQuestion.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-all"
            >
              <span className="flex items-center gap-1.5">
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-card border border-border text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card-hover transition-all"
          >
            ← Previous
          </button>
          {currentIndex === totalQuestions - 1 ? (
            <button
              onClick={() => {
                markExamNavigationIntent();
                router.push(`/exam/${examId}/review`);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:scale-[1.02] active:scale-[0.98] transition-all glow-primary shadow-lg shadow-primary/25"
            >
              Review & Submit →
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))
              }
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
