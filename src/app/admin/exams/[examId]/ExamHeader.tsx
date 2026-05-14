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
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
              exam.status === "waiting" ? "bg-warning/10 border-warning/20 text-warning" :
              exam.status === "in_progress" ? "bg-primary/10 border-primary/20 text-primary" :
              exam.status === "closed" ? "bg-success/10 border-success/20 text-success" :
              "border-border text-muted-foreground"
            }`}>
              {exam.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-12">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Code</span>
          <span className="text-sm font-mono font-bold text-primary tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
            {exam.exam_code}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1.5 bg-muted/30 border border-border rounded-xl">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          const isFilterable = m.value !== null;
          const isActive = statusFilter === m.value;

          return (
            <div key={m.label} className="flex items-center gap-1.5">
              {isFilterable ? (
                <button
                  onClick={() => onStatusFilterChange(isActive ? null : m.value)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                    isActive 
                      ? "bg-background shadow-sm ring-1 ring-border" 
                      : "hover:bg-background/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? m.color : "text-muted-foreground group-hover:text-foreground"}`} />
                  <div className="text-left leading-none">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mb-0.5">{m.label}</p>
                    <p className={`text-sm font-bold ${isActive ? m.color : "text-foreground"}`}>{m.count}</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left leading-none">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mb-0.5">{m.label}</p>
                    <p className="text-sm font-bold text-foreground">{m.count}</p>
                  </div>
                </div>
              )}
              {i < metrics.length - 1 && <div className="w-px h-6 bg-border mx-1" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
