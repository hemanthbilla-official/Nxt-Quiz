import Link from "next/link";
import { 
  Play, 
  Square, 
  Settings, 
  BarChart2, 
  Trash2, 
  Info, 
  Zap, 
  Clock, 
  Users 
} from "lucide-react";
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
      {/* Primary Actions */}
      <div className="card p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 -mt-4 -mr-4 bg-accent/5 rounded-full blur-2xl" />
        
        <h3 className="section-label mb-6 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-accent" />
          Control Panel
        </h3>

        <div className="space-y-4 relative">
          {exam.status === "waiting" && (
            <button
              onClick={onStart}
              disabled={starting || waitingCount === 0 || (exam.questionsCount || 0) === 0}
              className="btn-primary w-full h-12 text-sm shadow-lg shadow-accent/20"
            >
              {starting ? (
                <div className="spinner h-4 w-4" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Assessment</span>
                </>
              )}
            </button>
          )}

          {exam.status === "in_progress" && (
            <button
              onClick={onEnd}
              disabled={ending}
              className="w-full h-12 bg-danger text-white font-semibold rounded-lg hover:bg-danger/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-lg shadow-danger/20"
            >
              {ending ? (
                <div className="spinner h-4 w-4 border-white" />
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Terminate Session</span>
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            {(exam.status === "closed" || exam.status === "in_progress") && (
              <Link
                href={`/admin/exams/${examId}/analytics`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card-hover/30 hover:bg-card-hover hover:border-border-hover transition-all gap-2 group"
              >
                <BarChart2 className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Analytics</span>
              </Link>
            )}

            <button
              onClick={onOpenEdit}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card-hover/30 hover:bg-card-hover hover:border-border-hover transition-all gap-2 group"
            >
              <Settings className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Settings</span>
            </button>
          </div>

          <div className="pt-4 mt-2 border-t border-border/50">
            <button
              onClick={onDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-danger transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? "Deleting..." : "Permanently Delete"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Session Details */}
      <div className="card p-6">
        <h3 className="section-label mb-6 flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          Session Intel
        </h3>
        
        <div className="space-y-6">
          {timeLeft !== null && (
            <div className="p-5 rounded-2xl bg-background-secondary border border-border/50 flex flex-col items-center gap-2 shadow-inner">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Remaining</span>
              <span className={`text-4xl font-mono font-bold tracking-tighter ${timeLeft < 300 ? 'text-danger' : 'text-foreground'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium">Duration</span>
              </div>
              <span className="text-sm font-bold text-foreground">{Math.round(exam.duration_seconds / 60)}m</span>
            </div>
            
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium">Capacity</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {exam.capacity ? `${exam.capacity} slots` : "Unlimited"}
              </span>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium">Questions</span>
              </div>
              <span className="text-sm font-bold text-foreground">{exam.questionsCount || 0} loaded</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
