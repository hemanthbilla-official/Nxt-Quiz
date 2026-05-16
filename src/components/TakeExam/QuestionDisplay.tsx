"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Question, AnswerState } from "@/lib/quizTypes";
import type { ExamControls } from "@/lib/exam-controls";
import { markExamNavigationIntent } from "@/lib/exam-navigation";
import MarkdownViewer from "@/components/Common/MarkdownViewer";
import { Bookmark, SkipForward, X, ChevronLeft, ChevronRight } from "lucide-react";

const ProgrammingQuestion = dynamic(
  () => import("@/components/CodeEditor/ProgrammingQuestion"),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
        <div className="spinner" />
        <span className="text-sm">Loading editor...</span>
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
  isNavCollapsed: boolean;
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
  isNavCollapsed,
}: QuestionDisplayProps) {
  const router = useRouter();
  const [leftWidth, setLeftWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedWidth = localStorage.getItem("exam-editor-split");
    if (savedWidth) {
      setLeftWidth(Number(savedWidth));
    }
  }, []);

  // Implementation of 30/70 split when collapsed
  useEffect(() => {
    if (isProgrammingQuestion && isNavCollapsed && containerRef.current) {
      // Small delay to allow main container to expand
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          setLeftWidth(Math.floor(containerWidth * 0.3));
        }
      }, 350); // Matches the transition duration in TakeExamContent (300ms) + buffer
      return () => clearTimeout(timer);
    }
  }, [isNavCollapsed, isProgrammingQuestion]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const maxWidth = window.innerWidth - 400; // Leave at least 400px for code editor
      const newWidth = Math.max(300, Math.min(maxWidth, startWidth + deltaX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsResizing(false);
      const deltaX = upEvent.clientX - startX;
      const maxWidth = window.innerWidth - 400;
      const finalWidth = Math.max(300, Math.min(maxWidth, startWidth + deltaX));
      localStorage.setItem("exam-editor-split", finalWidth.toString());
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
      }`}
      key={currentIndex}
    >
      {isProgrammingQuestion ? (
        <div
          ref={containerRef}
          className={`flex flex-col lg:flex-row gap-0 h-[calc(100vh-10rem)] min-h-[600px] relative border border-border/50 rounded-xl overflow-hidden bg-card ${isResizing ? "cursor-col-resize select-none" : ""}`}
        >
          <div
            style={{ width: `${leftWidth}px` }}
            className={`flex-shrink-0 flex flex-col bg-card border-r border-border/50 overflow-hidden ${!isResizing ? "transition-[width] duration-300 ease-in-out" : ""}`}
          >
            <div className="px-4 py-3 border-b border-border/50 bg-background-secondary flex items-center justify-between">
              <span className="section-label text-accent">
                Problem Description
              </span>
              <span className="badge badge-default">
                {currentQuestion.topic}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar scroll-smooth bg-card">
              <MarkdownViewer content={currentQuestion.question} />

              {currentQuestion.codeSnippet && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <div className="section-label mb-3">
                    Reference Instructions
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-background-secondary text-sm leading-relaxed text-muted-foreground">
                    {currentQuestion.codeSnippet}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            onMouseDown={handleMouseDown}
            className={`hidden lg:flex w-2.5 z-10 cursor-col-resize items-center justify-center transition-colors -mx-1.5 relative group ${isResizing ? "bg-accent/20" : "hover:bg-accent/10"}`}
            title="Drag to resize"
          >
            <div className={`w-[1px] h-full transition-colors ${isResizing ? "bg-accent/60" : "bg-border group-hover:bg-accent/40"}`} />
            <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col gap-[3px] p-1 rounded-sm bg-background border shadow-sm transition-all ${isResizing ? "border-accent/40 opacity-100" : "border-border opacity-100 group-hover:border-accent/30"}`}>
              <div className={`w-0.5 h-0.5 rounded-full ${isResizing ? "bg-accent" : "bg-muted-foreground/60"}`} />
              <div className={`w-0.5 h-0.5 rounded-full ${isResizing ? "bg-accent" : "bg-muted-foreground/60"}`} />
              <div className={`w-0.5 h-0.5 rounded-full ${isResizing ? "bg-accent" : "bg-muted-foreground/60"}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#0a0c10]">
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
        <div className="space-y-6 py-2">
          {/* Question text */}
          <div className="bg-card border border-border/50 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-accent rounded-full" />
              <span className="section-label text-accent">
                Question Details
              </span>
            </div>
            <MarkdownViewer content={currentQuestion.question} className="text-base font-medium leading-relaxed" />
          </div>

          {/* Code snippet */}
          {currentQuestion.codeSnippet && (
            <div className="space-y-3">
              <span className="section-label px-1">Reference Code</span>
              <pre className="code-block">
                <code className="text-[13px]">{currentQuestion.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* MCQ Options */}
          <div className="space-y-3">
            <span className="section-label px-1">Select Answer</span>
            <div className="grid grid-cols-1 gap-2.5">
              {currentQuestion.options.map((option) => {
                const isSelected =
                  currentAnswer?.selected_option_id === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => selectOption(currentQuestion.id, option.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-150 group flex items-center gap-3 ${
                      isSelected
                        ? "border-accent bg-accent-muted ring-2 ring-accent/10"
                        : "border-border bg-card hover:border-accent/30 hover:bg-accent-muted/5"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-xs transition-all duration-150 ${
                        isSelected
                          ? "bg-accent border-accent text-white"
                          : "bg-background-secondary border-border text-muted-foreground group-hover:border-accent/50 group-hover:text-accent"
                      }`}
                    >
                      {option.id}
                    </div>
                    <span className={`text-sm leading-relaxed transition-colors ${isSelected ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* Action buttons */}
      <div className={`flex flex-col gap-2 mt-5 pt-4 border-t border-border lg:flex-row lg:items-center lg:justify-between ${isProgrammingQuestion ? "max-w-full" : ""}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {controls.bookmarksEnabled && (
            <button
              onClick={() => toggleBookmark(currentQuestion.id)}
              className={`btn-ghost text-xs gap-1.5 py-1.5 px-2.5 ${
                currentAnswer?.is_bookmarked
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "border border-border"
              }`}
            >
              <Bookmark className="w-3 h-3" />
              {currentAnswer?.is_bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          )}
          {controls.skipEnabled && (
            <button
              onClick={() => skipQuestion(currentQuestion.id)}
              className="btn-ghost text-xs gap-1.5 py-1.5 px-2.5 border border-border"
            >
              <SkipForward className="w-3 h-3" />
              Skip
            </button>
          )}
          {controls.clearAnswerEnabled && currentAnswer?.selected_option_id && (
            <button
              onClick={() => clearAnswer(currentQuestion.id)}
              className="btn-ghost text-xs gap-1.5 py-1.5 px-2.5 text-danger border border-danger/20 hover:bg-danger-muted"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="btn-secondary h-8 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          {currentIndex === totalQuestions - 1 ? (
            <button
              onClick={() => {
                markExamNavigationIntent();
                router.push(`/exam/${examId}/review`);
              }}
              className="btn-primary h-8 text-xs"
            >
              Review &amp; Submit →
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))
              }
              className="btn-primary h-8 text-xs gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
