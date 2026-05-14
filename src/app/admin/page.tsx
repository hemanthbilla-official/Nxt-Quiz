"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Users, 
  Clock, 
  Calendar, 
  ChevronRight,
  Inbox,
  Activity,
  ArrowUpRight,
  Layers
} from "lucide-react";

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

export default function AdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchExams = async () => {
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
    };
    fetchExams();
  }, []);

  const statusConfig: Record<string, { label: string; class: string }> = {
    draft: { label: "Draft", class: "bg-muted/10 text-muted-foreground border-muted/20" },
    waiting: { label: "Waiting", class: "bg-warning/10 text-warning border-warning/20" },
    in_progress: { label: "Live", class: "bg-primary/10 text-primary border-primary/20" },
    closed: { label: "Closed", class: "bg-success/10 text-success border-success/20" },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
        <div className="spinner mb-4 h-8 w-8" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Orchestrating Dashboard...</p>
      </div>
    );
  }

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.exam_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-10 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage your assessment pipeline.</p>
        </div>
        
        <Link href="/admin/exams/new" className="btn-primary h-11 px-6 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Create Assessment</span>
        </Link>
      </div>

      {/* Main Content Card */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Exam Repository</h2>
          </div>

          <div className="relative max-w-xs w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by title or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-background border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="card overflow-hidden">
            <div className="p-20 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Inbox className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold">
                {searchQuery ? "No matching records" : "Repository empty"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto mb-8">
                {searchQuery 
                  ? "Adjust your search parameters to find the specific assessment." 
                  : "Begin by creating your first exam to see it listed here in the repository."}
              </p>
              {!searchQuery && (
                <Link href="/admin/exams/new" className="btn-secondary h-10 px-6 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Initialize Repository</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => {
              const config = statusConfig[exam.status] || statusConfig.draft;
              return (
                <Link
                  key={exam.id}
                  href={`/admin/exams/${exam.id}`}
                  className="flex flex-col justify-between p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary uppercase tracking-widest">
                        {exam.exam_code}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${config.class}`}>
                        {config.label}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">
                      {exam.title}
                    </h4>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Users className="w-4 h-4" />
                        <span>{exam.participant_count || 0} Students</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Clock className="w-4 h-4" />
                        <span>{Math.round(exam.duration_seconds / 60)} Minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(exam.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Control Panel</span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
