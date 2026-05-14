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

  return (
    <>
      <aside
        className={`w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-border p-4 overflow-y-auto lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] transition-all ${
          showNav ? "" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Questions</h3>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
              {questions.length}
            </span>
          </div>
          <button
            onClick={() => setShowNav(false)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors duration-150 text-[11px] font-bold uppercase tracking-wider"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Hide
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 text-[11px] font-medium">
          <div className="flex items-center gap-2 p-2 rounded bg-card border border-border/40">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-card border border-border/40">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">Skipped</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-card border border-border/40">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Bookmarked</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-card border border-border/40">
            <span className="w-2 h-2 rounded-full bg-border" />
            <span className="text-muted-foreground">Unanswered</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const isAnswered = !!(a?.selected_option_id || a?.code_answer?.trim());
            const isSkipped = !!a?.is_skipped;
            const isBookmarked = !!a?.is_bookmarked;
            const isCurrent = i === currentIndex;
            
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`q-dot flex flex-col items-center justify-between py-1.5 h-10 ${isCurrent ? "current" : ""}`}
                title={`Question ${i + 1}`}
              >
                <span className={`text-[13px] font-bold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                  {i + 1}
                </span>
                
                <div className="flex items-center justify-center gap-0.5 h-1.5">
                  {isAnswered && (
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  )}
                  {isSkipped && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  )}
                  {isBookmarked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  {!isAnswered && !isSkipped && !isBookmarked && (
                    <span className="w-1 h-1 rounded-full bg-border/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>




        <div className="mt-6">
          <button
            onClick={() => {
              markExamNavigationIntent();
              router.push(`/exam/${examId}/review`);
            }}
            className="w-full py-3 rounded text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors duration-150"
          >
            Review &amp; Submit
          </button>
        </div>
      </aside>

      {!showNav && (
        <button
          onClick={() => setShowNav(true)}
          className="fixed right-4 bottom-4 w-10 h-10 rounded bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors duration-150 z-50"
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
