"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Trophy, ArrowRight } from "lucide-react";

interface ScoreRecord {
  exam_id: string;
  exam_title: string;
  total_score: number;
  max_score: number;
  submitted_at: string;
}

interface AttemptWithExam {
  exam_id: string;
  total_score: number;
  max_score: number;
  submitted_at: string;
  exams: {
    title: string;
  } | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

export default function MyScores() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadScores = async () => {
      try {
        const res = await fetch("/api/scores");
        if (!res.ok) {
          if (res.status === 401) return router.push("/login");
          return;
        }

        const data = await res.json();

        if (data.attempts) {
          const formattedScores: ScoreRecord[] = (data.attempts as AttemptWithExam[]).map((a) => ({
            exam_id: a.exam_id,
            exam_title: a.exams?.title || "Unknown Exam",
            total_score: a.total_score || 0,
            max_score: a.max_score || 0,
            submitted_at: a.submitted_at
          }));
          setScores(formattedScores.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()));
        }
      } catch (err) {
        console.error("Failed to load scores:", err);
      } finally {
        setLoading(false);
      }
    };

    loadScores();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground tracking-tight">Loading performance...</p>
      </div>
    );
  }

  // Calculate stats

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20 pb-20">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/exam/join")}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Performance</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-8 md:pt-12">
        
        {scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg bg-muted/10 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Trophy className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No assessments completed</h3>
            <p className="text-xs text-muted-foreground mb-6 max-w-[250px]">
              Take your first test to start building your performance history.
            </p>
            <button
              onClick={() => router.push("/exam/join")}
              className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Start an Assessment
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-semibold tracking-tight">Test History</h2>
            </div>

            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-5 pl-2">Assessment</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-1 text-right pr-2">Action</div>
              </div>

              {/* List Body */}
              <div className="divide-y divide-border">
                {scores.map((record) => {
                  const percentage = record.max_score ? Math.round((record.total_score / record.max_score) * 100) : 0;
                  const isPass = percentage >= 40;

                  return (
                    <div 
                      key={record.exam_id} 
                      onClick={() => router.push(`/exam/${record.exam_id}/submitted`)}
                      className="group flex flex-col md:grid md:grid-cols-12 gap-4 p-4 md:items-center hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      {/* Title */}
                      <div className="md:col-span-5 flex flex-col gap-1 pl-2">
                        <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                          {record.exam_title}
                        </h4>
                        <div className="md:hidden flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(record.submitted_at)}</span>
                        </div>
                      </div>

                      {/* Date (Desktop) */}
                      <div className="hidden md:flex md:col-span-2 items-center text-sm text-muted-foreground">
                        {formatDate(record.submitted_at)}
                      </div>

                      {/* Status */}
                      <div className="md:col-span-2 flex items-center">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium uppercase tracking-wider ${isPass ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                          {isPass ? 'Passed' : 'Failed'}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="md:col-span-2 flex items-center gap-3">
                        <span className="font-mono text-sm font-medium">
                          {percentage}%
                        </span>
                        <div className="w-full max-w-[60px] h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isPass ? 'bg-success' : 'bg-danger'}`} 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                      </div>

                      {/* Action */}
                      <div className="md:col-span-1 flex items-center justify-end pr-2">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-background border border-transparent group-hover:border-border transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}