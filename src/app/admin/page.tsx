"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
      const res = await fetch("/api/admin/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
      setLoading(false);
    };
    fetchExams();
  }, []);

  const statusColors: Record<string, string> = {
    draft: "text-muted bg-muted/10 border-muted/20",
    waiting: "text-warning bg-warning/10 border-warning/20",
    in_progress: "text-primary bg-primary/10 border-primary/20",
    closed: "text-success bg-success/10 border-success/20",
  };

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const grouped = {
    in_progress: exams.filter((e) => e.status === "in_progress"),
    waiting: exams.filter((e) => e.status === "waiting"),
    closed: exams.filter((e) => e.status === "closed"),
  };

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.exam_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-foreground">Exam Dashboard</h1>
        
        {/* Compact Metrics Bar */}
        <div className="flex flex-wrap items-center gap-3 glass-card px-4 py-2 rounded-2xl w-full md:w-auto">
          {[
            { label: "Active", count: grouped.in_progress.length, color: "text-primary", dot: "bg-primary" },
            { label: "Waiting", count: grouped.waiting.length, color: "text-warning", dot: "bg-warning" },
            { label: "Closed", count: grouped.closed.length, color: "text-success", dot: "bg-success" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.dot} ${s.label === "Active" && s.count > 0 ? "animate-pulse" : ""}`}></span>
                <span className="text-sm font-medium text-foreground">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
              </div>
              {i < 2 && <div className="w-px h-6 bg-border mx-1"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-2 flex items-center gap-3 h-14 mb-6">
        <svg aria-hidden="true" className="w-5 h-5 text-muted-foreground ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input 
          type="text" 
          placeholder="Search exams by title or code..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-sm text-foreground p-2 outline-none h-full"
          aria-label="Search exams by title or code"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="p-2 mr-1 text-muted-foreground hover:text-foreground flex-shrink-0" aria-label="Clear search">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Exam List */}
      {filteredExams.length === 0 ? (
        <div className="glass-card p-16 text-center border-dashed border-2 border-border/50">
          <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No exams found</h3>
          <p className="text-muted-foreground mb-6 text-sm">Create a new exam to get started or adjust your search.</p>
          <Link href="/admin/exams/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create First Exam
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/exams/${exam.id}`}
              className="group relative block glass-card p-6 overflow-hidden hover:border-primary/30 transition-all duration-300"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${
                exam.status === "in_progress" ? "bg-primary" : 
                exam.status === "waiting" ? "bg-warning" : 
                exam.status === "closed" ? "bg-success" : "bg-muted"
              }`}></div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-accent/10 text-accent font-bold tracking-wider">
                      {exam.exam_code}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border ${statusColors[exam.status] || ""}`}>
                      {exam.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {exam.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-muted-foreground mt-3">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      {exam.participant_count || 0} students
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {Math.round(exam.duration_seconds / 60)} mins
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {new Date(exam.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center sm:justify-end">
                  <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white text-muted-foreground transition-all duration-300 transform group-hover:translate-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
