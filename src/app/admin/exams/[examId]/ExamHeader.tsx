import Link from "next/link";
import { ArrowLeft, Database, Activity, UserCheck, Users } from "lucide-react";
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
      icon: Users,
    },
    {
      label: "Active",
      value: "active",
      count: activeCount,
      color: "text-primary",
      icon: Activity,
    },
    {
      label: "Submitted",
      value: "submitted",
      count: submittedCount,
      color: "text-success",
      icon: UserCheck,
    },
    {
      label: "Pool",
      value: null as string | null,
      count: exam.questionsCount || 0,
      color: "text-muted-foreground",
      icon: Database,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{exam.title}</h1>
            <span className={`badge ${
              exam.status === "waiting" ? "badge-warning" :
              exam.status === "in_progress" ? "badge-accent" :
              exam.status === "closed" ? "badge-success" :
              "badge-default"
            }`}>
              {exam.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-12">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Code</span>
          <span className="text-sm font-mono font-bold text-accent tracking-widest bg-accent/5 px-2 py-0.5 rounded border border-accent/10">
            {exam.exam_code}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1.5 bg-background-secondary border border-border/50 rounded-xl">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          const isFilterable = m.value !== null;
          const isActive = statusFilter === m.value;

          return (
            <div key={m.label} className="flex items-center">
              {isFilterable ? (
                <button
                  onClick={() => onStatusFilterChange(isActive ? null : m.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                    isActive 
                      ? "bg-card shadow-sm border border-border ring-1 ring-black/5" 
                      : "hover:bg-card/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? m.color : "text-muted-foreground group-hover:text-foreground"}`} />
                  <div className="text-left leading-none">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className={`text-sm font-bold ${isActive ? m.color : "text-foreground"}`}>{m.count}</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left leading-none">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-bold text-foreground">{m.count}</p>
                  </div>
                </div>
              )}
              {i < metrics.length - 1 && <div className="w-px h-8 bg-border/50 mx-1.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
