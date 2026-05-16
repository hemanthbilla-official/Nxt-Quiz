import type { Question, AnswerState } from "@/lib/quizTypes";
import { markExamNavigationIntent } from "@/lib/exam-navigation";
import { useRouter } from "next/navigation";
import { X, Grid3X3 } from "lucide-react";

interface QuestionNavigatorProps {
  questions: Question[];
  answers: Record<string, AnswerState>;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  showNav: boolean;
  setShowNav: (show: boolean) => void;
  examId: string;
}

export function QuestionNavigator({
  questions,
  answers,
  currentIndex,
  setCurrentIndex,
  showNav,
  setShowNav,
  examId,
}: QuestionNavigatorProps) {
  const router = useRouter();

  return (
    <>
      <aside
        className={`border-t lg:border-t-0 lg:border-l border-border/50 p-4 lg:p-5 overflow-y-auto lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] transition-all bg-background-secondary/30 h-full w-72`}
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Questions
            </h3>
            <span className="badge badge-accent">{questions.length}</span>
          </div>
          <button
            onClick={() => setShowNav(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Answered
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Skipped
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Flagged
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground">
              To Do
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const isAnswered = !!(
              a?.selected_option_id || a?.code_answer?.trim()
            );
            const isSkipped = !!a?.is_skipped;
            const isBookmarked = !!a?.is_bookmarked;
            const isCurrent = i === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`flex flex-col items-center justify-center h-10 rounded-lg transition-all border relative ${
                  isCurrent
                    ? "border-accent bg-accent-muted ring-2 ring-accent/10"
                    : isAnswered
                      ? "border-transparent bg-card hover:border-accent/30"
                      : "border-transparent bg-background-secondary hover:border-border-hover"
                }`}
                title={`Question ${i + 1}`}
              >
                <span
                  className={`text-sm font-semibold tabular-nums ${isCurrent ? "text-accent" : "text-foreground"}`}
                >
                  {i + 1}
                </span>

                <div className="flex items-center justify-center gap-0.5 h-0.5">
                  {isAnswered && (
                    <span className="w-1 h-1 rounded-full bg-success" />
                  )}
                  {isSkipped && (
                    <span className="w-1 h-1 rounded-full bg-warning" />
                  )}
                  {isBookmarked && (
                    <span className="w-1 h-1 rounded-full bg-accent" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit button */}
        <div className="mt-6">
          <button
            onClick={() => {
              markExamNavigationIntent();
              router.push(`/exam/${examId}/review`);
            }}
            className="btn-primary w-full h-10 text-sm font-medium"
          >
            Review &amp; Submit
          </button>
        </div>
      </aside>

      {!showNav && (
        <button
          onClick={() => setShowNav(true)}
          className="fixed right-4 bottom-4 w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors z-50 shadow-md"
          title="Show question navigator"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
