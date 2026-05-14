import type { Question, AnswerState } from "@/lib/quizTypes";
import { markExamNavigationIntent } from "@/lib/exam-navigation";
import { useRouter } from "next/navigation";

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

  const getQuestionStatus = (qId: string) => {
    const a = answers[qId];
    if (!a) return "unanswered";
    if (a.selected_option_id) return "answered";
    if (a.code_answer?.trim()) return "answered";
    if (a.is_bookmarked) return "bookmarked";
    if (a.is_skipped) return "skipped";
    return "unanswered";
  };

  return (
    <>
      {/* Question navigator sidebar */}
      <aside
        className={`w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border p-4 overflow-y-auto lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] transition-all ${
          showNav ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">Questions</h3>
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {questions.length}
            </span>
          </div>
          <button
            onClick={() => setShowNav(false)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-all text-[11px] font-bold uppercase tracking-wider"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Hide
          </button>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 mb-8 text-[11px] font-medium">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/40">
            <span className="w-2.5 h-2.5 rounded-full bg-success ring-4 ring-success/10" />
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/40">
            <span className="w-2.5 h-2.5 rounded-full bg-warning ring-4 ring-warning/10" />
            <span className="text-muted-foreground">Skipped</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/40">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-secondary/10" />
            <span className="text-muted-foreground">Bookmarked</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/40">
            <span className="w-2.5 h-2.5 rounded-full bg-border ring-4 ring-border/10" />
            <span className="text-muted-foreground">Unanswered</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const status = getQuestionStatus(q.id);
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`q-dot ${isCurrent ? "current" : status}`}
                title={`Question ${i + 1} - ${status}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Review button */}
        <div className="mt-6">
          <button
            onClick={() => {
              markExamNavigationIntent();
              router.push(`/exam/${examId}/review`);
            }}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:scale-[1.02] active:scale-[0.98] transition-all glow-primary"
          >
            Review & Submit
          </button>
        </div>
      </aside>

      {/* Show nav toggle when hidden */}
      {!showNav && (
        <button
          onClick={() => setShowNav(true)}
          className="fixed right-4 bottom-4 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
          title="Show question navigator"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
    </>
  );
}
