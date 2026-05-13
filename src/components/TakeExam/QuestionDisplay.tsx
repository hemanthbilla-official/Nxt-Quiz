import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Question, AnswerState } from "@/lib/quizTypes";
import type { ExamControls } from "@/lib/exam-controls";
import { markExamNavigationIntent } from "@/lib/exam-navigation";

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

  return (
    <div
      className={`${
        isProgrammingQuestion ? "max-w-6xl" : "max-w-3xl"
      } mx-auto animate-fade-in`}
      key={currentIndex}
    >
      {/* Question */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground leading-relaxed">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Programming question: show code editor */}
      {isProgrammingQuestion ? (
        <>
          {currentQuestion.codeSnippet && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Instructions
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {currentQuestion.codeSnippet}
              </div>
            </div>
          )}
          <ProgrammingQuestion
            questionId={currentQuestion.id}
            challengeMode={currentQuestion.challengeMode || "function"}
            starterCode={currentQuestion.starterCode || ""}
            testCases={currentQuestion.testCases || []}
            savedCode={currentAnswer?.code_answer}
            onCodeChange={(code) => saveCodeAnswer(currentQuestion.id, code)}
            examId={examId}
            controls={controls}
          />
        </>
      ) : (
        <>
          {/* Code snippet (MCQ with code) */}
          {currentQuestion.codeSnippet && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Code
                </span>
                <span className="text-xs text-muted px-2 py-0.5 rounded bg-border/50">
                  React / JSX
                </span>
              </div>
              <pre className="code-block whitespace-pre-wrap">
                <code>{currentQuestion.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* MCQ Options */}
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
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:border-border-hover hover:bg-card-hover text-muted-foreground"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                        isSelected
                          ? "bg-primary text-white"
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

      {/* Action buttons */}
      <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-border lg:flex-row lg:items-center lg:justify-between">
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
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:scale-[1.02] active:scale-[0.98] transition-all glow-primary"
            >
              Review & Submit →
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))
              }
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
