import Link from "next/link";
import { ExamData } from "./types";

interface ExamSidebarProps {
  exam: ExamData;
  examId: string;
  waitingCount: number;
  timeLeft: number | null;
  formatTime: (seconds: number) => string;
  starting: boolean;
  ending: boolean;
  deleting: boolean;
  onStart: () => void;
  onEnd: () => void;
  onDelete: () => void;
  onOpenEdit: () => void;
}

export default function ExamSidebar({
  exam,
  examId,
  waitingCount,
  timeLeft,
  formatTime,
  starting,
  ending,
  deleting,
  onStart,
  onEnd,
  onDelete,
  onOpenEdit,
}: ExamSidebarProps) {
  return (
    <div className="w-full lg:w-80 space-y-6">
      {/* Exam Actions */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Exam Actions
        </h3>

        <div className="space-y-4">
          {exam.status === "waiting" && (
            <button
              onClick={onStart}
              disabled={
                starting ||
                waitingCount === 0 ||
                (exam.questionsCount || 0) === 0
              }
              className="w-full px-4 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-success to-accent text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-success/20"
            >
              {starting ? (
                <div
                  className="spinner"
                  style={{
                    width: 16,
                    height: 16,
                    borderTopColor: "white",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                />
              ) : (
                <>
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
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Start Exam Now
                </>
              )}
            </button>
          )}

          {exam.status === "in_progress" && (
            <button
              onClick={onEnd}
              disabled={ending}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-danger to-warning text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-danger/20"
            >
              {ending ? (
                <div
                  className="spinner"
                  style={{
                    width: 16,
                    height: 16,
                    borderTopColor: "white",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                />
              ) : (
                <>
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
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                  End Exam Early
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(exam.status === "closed" ||
              exam.status === "in_progress") && (
              <Link
                href={`/admin/exams/${examId}/analytics`}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border text-foreground hover:bg-card-hover transition-colors group text-center gap-1.5"
              >
                <svg
                  className="w-5 h-5 text-primary group-hover:scale-110 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-[11px] font-semibold">Analytics</span>
              </Link>
            )}

            <button
              onClick={onOpenEdit}
              className={`flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border text-foreground hover:bg-card-hover transition-colors group text-center gap-1.5 ${
                exam.status === "closed" || exam.status === "in_progress"
                  ? "col-span-1"
                  : "col-span-2"
              }`}
            >
              <svg
                className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                />
              </svg>
              <span className="text-[11px] font-semibold">Settings</span>
            </button>

          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={onDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 transition-all"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {deleting ? "Deleting..." : "Delete Exam"}
            </button>
          </div>
        </div>
      </div>

      {/* Exam Details Box */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Exam Details
        </h3>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold text-foreground capitalize">
              {exam.status.replace("_", " ")}
            </span>
          </div>
          {timeLeft !== null && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-primary font-medium">Time Left</span>
              <span className="font-mono font-bold text-primary animate-pulse">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-semibold text-foreground">
              {Math.round(exam.duration_seconds / 60)} minutes
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-semibold text-foreground">
              {exam.capacity ? `${exam.capacity} slots` : "Unlimited"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-semibold text-foreground">
              {exam.created_at
                ? new Date(exam.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
