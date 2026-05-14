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
      <div className="card p-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          Control Panel
        </h3>

        <div className="space-y-4">
          {exam.status === "waiting" && (
            <button
              onClick={onStart}
              disabled={starting || waitingCount === 0 || (exam.questionsCount || 0) === 0}
              className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-sm"
            >
              {starting ? (
                <div className="spinner h-4 w-4 border-white border-t-transparent" />
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
              className="btn-primary w-full h-12 bg-danger hover:bg-danger/90 flex items-center justify-center gap-2 text-sm"
            >
              {ending ? (
                <div className="spinner h-4 w-4 border-white border-t-transparent" />
              ) : (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Terminate Session</span>
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenEdit}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-transparent hover:bg-muted transition-colors gap-2 group"
            >
              <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
            </button>

            {(exam.status === "closed" || exam.status === "in_progress") && (
              <Link
                href={`/admin/exams/${examId}/analytics`}
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-transparent hover:bg-muted transition-colors gap-2 group"
              >
                <BarChart2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Analytics</span>
              </Link>
            )}
          </div>

          <div className="pt-4 border-t border-border">
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
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          Session Intel
        </h3>
        
        <div className="space-y-5">
          {timeLeft !== null && (
            <div className="p-4 rounded-lg bg-transparent border border-border flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Remaining</span>
              <span className="text-3xl font-mono font-medium text-foreground tracking-tighter">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 text-xs font-medium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration</span>
              </div>
              <span className="font-bold text-foreground">{Math.round(exam.duration_seconds / 60)}m</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>Capacity</span>
              </div>
              <span className="font-bold text-foreground">
                {exam.capacity ? `${exam.capacity} slots` : "Unlimited"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Questions</span>
              </div>
              <span className="font-bold text-foreground">{exam.questionsCount || 0} loaded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
