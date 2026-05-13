import Link from "next/link";
import { ExamData, STATUS_COLORS } from "./types";

interface ExamHeaderProps {
  exam: ExamData;
  waitingCount: number;
  activeCount: number;
  submittedCount: number;
  statusFilter: string | null;
  onStatusFilterChange: (filter: string | null) => void;
}

export default function ExamHeader({
  exam,
  waitingCount,
  activeCount,
  submittedCount,
  statusFilter,
  onStatusFilterChange,
}: ExamHeaderProps) {
  const metrics = [
    {
      label: "Waiting",
      value: "waiting",
      count: waitingCount,
      color: "text-warning",
      dot: "bg-warning",
      hover: "hover:bg-warning/10",
    },
    {
      label: "Active",
      value: "active",
      count: activeCount,
      color: "text-primary",
      dot: "bg-primary",
      hover: "hover:bg-primary/10",
    },
    {
      label: "Submitted",
      value: "submitted",
      count: submittedCount,
      color: "text-success",
      dot: "bg-success",
      hover: "hover:bg-success/10",
    },
    {
      label: "Questions",
      value: null as string | null,
      count: exam.questionsCount || 0,
      color: "text-accent",
      dot: "bg-accent",
      hover: "",
    },
  ];

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground transition-colors mr-2"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1
            className="text-2xl sm:text-3xl font-bold text-foreground line-clamp-1 max-w-full md:max-w-[400px]"
            title={exam.title}
          >
            {exam.title}
          </h1>
          <span
            className={`text-xs px-3 py-1 rounded-lg border ${STATUS_COLORS[exam.status] || "border-border"}`}
          >
            {exam.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-mono ml-10">
          Code:{" "}
          <span className="text-accent font-bold">{exam.exam_code}</span>
        </p>
      </div>

      {/* Compact Metrics Bar with Filters */}
      <div className="flex flex-wrap items-center gap-1 glass-card px-2 py-2 rounded-2xl w-full md:w-auto">
        {metrics.map((s, i) => {
          const isClickable = s.value !== null;
          const isActive = statusFilter === s.value;

          return (
            <div key={s.label} className="flex items-center">
              {isClickable ? (
                <button
                  onClick={() =>
                    onStatusFilterChange(isActive ? null : s.value)
                  }
                  aria-label={`Filter by ${s.label}`}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer focus:outline-none ${s.hover} ${isActive ? "bg-muted/10 ring-1 ring-border shadow-sm" : "bg-transparent"}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${s.dot} ${s.label === "Active" && s.count > 0 ? "animate-pulse" : ""}`}
                  ></span>
                  <span className="text-sm font-medium text-foreground">
                    {s.label}
                  </span>
                  <span className={`text-sm font-bold ${s.color}`}>
                    {s.count}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent select-none">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
                  <span className="text-sm font-medium text-foreground">
                    {s.label}
                  </span>
                  <span className={`text-sm font-bold ${s.color}`}>
                    {s.count}
                  </span>
                </div>
              )}
              {i < 3 && <div className="w-px h-6 bg-border mx-1"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
