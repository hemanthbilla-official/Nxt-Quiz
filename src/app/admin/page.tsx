"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Clock,
  Calendar,
  Inbox,
  ArrowRight
} from "lucide-react";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

interface Exam {
  id: string;
  exam_code: string;
  title: string;
  status: string;
  capacity: number;
  duration_seconds: number;
  created_at: string;
  participant_count?: number;
}

// Memoized exam row component to prevent unnecessary re-renders
const ExamRow = memo(function ExamRow({ 
  exam, 
  config 
}: { 
  exam: Exam; 
  config: { label: string; badgeClass: string; dotClass: string };
}) {
  return (
    <Link
      href={`/admin/exams/${exam.id}`}
      className="group flex flex-col md:grid md:grid-cols-12 gap-4 p-4 md:items-center hover:bg-muted/40 transition-colors"
    >
      <div className="md:col-span-4 flex flex-col gap-1 pl-2">
        <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
          {exam.title}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(exam.created_at).toLocaleDateString(undefined, { 
              month: "short", 
              day: "numeric",
              year: "numeric"
            })}
          </span>
        </div>
      </div>

      <div className="md:col-span-2 flex items-center">
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${config.badgeClass}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
          {config.label}
        </div>
      </div>

      <div className="md:col-span-2 flex items-center">
        <span className="font-mono text-xs px-2 py-1 rounded bg-muted/50 text-foreground border border-border/50">
          {exam.exam_code}
        </span>
      </div>

      <div className="md:col-span-3 flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5" title="Participants">
          <Users className="w-4 h-4" />
          <span>{exam.participant_count || 0}</span>
        </div>
        <div className="flex items-center gap-1.5" title="Duration">
          <Clock className="w-4 h-4" />
          <span>{Math.round(exam.duration_seconds / 60)}m</span>
        </div>
      </div>

      <div className="md:col-span-1 flex items-center justify-end pr-2">
        <div className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-background border border-transparent group-hover:border-border transition-all">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
});

export default function AdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchExams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
    draft: { label: "Draft", badgeClass: "text-muted-foreground bg-muted border-border", dotClass: "bg-muted-foreground" },
    waiting: { label: "Waiting", badgeClass: "text-warning bg-warning-muted border-warning/20", dotClass: "bg-warning" },
    in_progress: { label: "Live", badgeClass: "text-accent bg-accent-muted border-accent/20", dotClass: "bg-accent animate-pulse" },
    closed: { label: "Closed", badgeClass: "text-success bg-success-muted border-success/20", dotClass: "bg-success" },
  };

  const filteredExams = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return exams.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.exam_code.toLowerCase().includes(query)
    );
  }, [exams, searchQuery]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your deployed assessments and monitor live sessions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full bg-background border-border hover:border-border-hover focus:border-foreground focus:ring-0 shadow-sm transition-colors"
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>
          <Link href="/admin/exams/new" className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity shrink-0 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </Link>
        </div>
      </div>

      {/* List/Table Hybrid */}
      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-lg bg-muted/10 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {searchQuery ? "No matching assessments" : "No assessments yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
              {searchQuery
                ? "Try adjusting your search terms."
                : "Create your first assessment to get started."}
            </p>
            {!searchQuery && (
              <Link href="/admin/exams/new" className="h-9 px-4 inline-flex items-center justify-center bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
                Create Assessment
              </Link>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            {/* Table Header (Desktop only) */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4 pl-2">Assessment</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Code</div>
              <div className="col-span-3">Details</div>
              <div className="col-span-1 text-right pr-2">Action</div>
            </div>

            {/* List Body */}
            <div className="divide-y divide-border">
              {filteredExams.map((exam) => {
                const config = statusConfig[exam.status] || statusConfig.draft;
                return (
                  <ExamRow
                    key={exam.id}
                    exam={exam}
                    config={config}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

