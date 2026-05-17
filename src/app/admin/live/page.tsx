"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, ArrowUpRight, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

interface Exam {
  id: string;
  exam_code: string;
  title: string;
  status: string;
  capacity: number;
  participant_count: number;
  waiting_count?: number;
  active_count?: number;
  submitted_count?: number;
  total_tab_switches?: number;
  duration_seconds: number;
  starts_at: string | null;
}

export default function LiveMonitor() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchExams = useCallback(async (isBackground = false) => {
    try {
      const res = await fetch("/api/admin/exams/live-stats");

      if (res.status === 403) {
        router.push("/admin/login");
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setExams(data.exams || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch";
      if (!isBackground) {
        setError(message);
      }
      console.error("Failed to fetch live stats:", message);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    fetchExams();

    const supabase = createClient();
    let isRealtimeConnected = false;
    let fallbackInterval: ReturnType<typeof setTimeout> | undefined = undefined;
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        fetchExams(true);
      }, 2000); // Debounce updates to max 1 per 2 seconds
    };

    const channel = supabase
      .channel("admin-live-monitor-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exams" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attempts" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "attempts" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_participants" },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          isRealtimeConnected = true;
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = undefined;
          }
        }
      });

    // Fallback polling only if WebSocket fails to connect after 10s
    fallbackInterval = setTimeout(() => {
      if (!isRealtimeConnected) {
        const pollInterval = setInterval(() => fetchExams(true), 5000);
        return () => clearInterval(pollInterval);
      }
    }, 10000);

    return () => {
      clearTimeout(fallbackInterval);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [fetchExams]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
        <div className="spinner mb-4" style={{ width: 28, height: 28 }} />
        <p className="section-label">Loading live data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger-muted p-3 text-sm text-danger font-medium">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Monitor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time status of active and waiting exams.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-success-muted text-success text-xs font-medium">
          <Radio className="w-3 h-3 animate-pulse" />
          Auto-refreshing
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No live exams</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No exams are currently live or in the waiting room.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const progress = Math.min((exam.participant_count / exam.capacity) * 100, 100);
            const isLive = exam.status === "in_progress";

            return (
              <Link
                key={exam.id}
                href={`/admin/exams/${exam.id}`}
                className="card p-5 hover:border-border-hover transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] text-foreground group-hover:text-accent transition-colors line-clamp-1 leading-snug">
                      {exam.title}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {exam.exam_code}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ml-2 ${
                    isLive ? "badge-accent" : "badge-warning"
                  }`}>
                    {exam.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-warning-muted/50 text-center">
                      <p className="text-sm font-bold text-warning tabular-nums">{exam.waiting_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Waiting</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-accent-muted/50 text-center">
                      <p className="text-sm font-bold text-accent tabular-nums">{exam.active_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Active</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-success-muted/50 text-center">
                      <p className="text-sm font-bold text-success tabular-nums">{exam.submitted_count || 0}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Done</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Enrollment</span>
                      <span className="font-medium tabular-nums">{exam.participant_count}/{exam.capacity}</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${isLive ? "bg-accent" : "bg-warning"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Tab switches alert */}
                  {exam.total_tab_switches && exam.total_tab_switches > 0 ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-danger-muted text-danger text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {exam.total_tab_switches} tab switches detected
                    </div>
                  ) : null}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(exam.duration_seconds / 60)} min
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-accent transition-colors">
                      Details
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
