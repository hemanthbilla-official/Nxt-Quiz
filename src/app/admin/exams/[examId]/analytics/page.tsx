"use client";

import React, { useState, useEffect, use, useMemo, Fragment, useCallback, memo } from "react";
import { createClient } from "@/lib/supabase/browser";
import dynamic from "next/dynamic";
import MarkdownViewer from "@/components/Common/MarkdownViewer";

const ScoreDistributionChart = dynamic(
  () => import("@/components/Admin/Analytics/ScoreDistributionChart"),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div> }
);

const TopicPerformanceChart = dynamic(
  () => import("@/components/Admin/Analytics/TopicPerformanceChart"),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div> }
);

const GradeDistributionChart = dynamic(
  () => import("@/components/Admin/Analytics/GradeDistributionChart"),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div> }
);

const lazyLoadPDF = async () => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
};

/* ──────────────────────────── TYPES ──────────────────────────── */

interface ExamMeta {
  id: string;
  title: string;
  examCode: string;
  status: string;
  durationSeconds: number;
  capacity: number;
  startsAt: string | null;
  closesAt: string | null;
  createdAt: string;
}

interface Summary {
  totalParticipants: number;
  totalSubmitted: number;
  avgScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
  maxPossible: number;
  passRate: number;
  totalQuestions: number;
}

interface OptionBreakdown {
  A: number;
  B: number;
  C: number;
  D: number;
}

interface OptionStudents {
  A: string[];
  B: string[];
  C: string[];
  D: string[];
}

interface CodingMetrics {
  totalSubmissions: number;
  avgExecutionTimeMs: number;
  failedTestCases: Record<string, number>;
  languageStats?: Record<string, number>;
  runtimeDistribution?: Record<string, number>;
}

interface DetailedQuestion {
  position: number;
  points: number;
  questionId: string;
  questionText: string;
  codeSnippet: string | null;
  topic: string;
  difficulty: string;
  questionType: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  tags: string[];
  correctPercentage: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  bookmarkedCount: number;
  submittedAttempts: number;
  optionBreakdown: OptionBreakdown;
  optionStudents: OptionStudents;
  codingMetrics?: CodingMetrics;
}

interface StudentResult {
  name: string;
  email: string;
  college_id: string;
  score: number;
  max_score: number;
  percentage: number;
  grade: string;
  timeToSubmitSeconds: number | null;
  submitted_at: string | null;
  tab_switch_count: number;
}

interface TimeAnalytics {
  avgTimeSeconds: number;
  fastestTimeSeconds: number | null;
  slowestTimeSeconds: number | null;
  earlySubmissions: number;
  onTimeSubmissions: number;
  lateSubmissions: number;
  examDurationSeconds: number;
  submissionTimeline: { time: string; count: number }[];
}

interface ExamHealth {
  hardestQuestion: {
    position: number;
    text: string;
    correctPct: number;
  } | null;
  easiestQuestion: {
    position: number;
    text: string;
    correctPct: number;
  } | null;
  mostSkipped: { position: number; text: string; count: number } | null;
  mostBookmarked: { position: number; text: string; count: number } | null;
}

interface AnalyticsData {
  examMeta: ExamMeta;
  summary: Summary;
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
  topicPerformance: {
    topic: string;
    avgCorrectPct: number;
    questionCount: number;
    totalAttempts: number;
  }[];
  scoreDistribution: { range: string; count: number }[];
  difficultyBreakdown: {
    difficulty: string;
    avgCorrectPct: number;
    questionCount: number;
  }[];
  detailedQuestions: DetailedQuestion[];
  studentResults: StudentResult[];
  timeAnalytics: TimeAnalytics;
  examHealth: ExamHealth;
}

/* ──────────────────────────── HELPERS ──────────────────────────── */

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

const GRADE_COLORS: Record<string, string> = {
  A: "#10b981",
  B: "#06b6d4",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function pctColor(pct: number): string {
  if (pct >= 70) return "text-success";
  if (pct >= 40) return "text-warning";
  return "text-danger";
}

function pctBg(pct: number): string {
  if (pct >= 70) return "bg-success";
  if (pct >= 40) return "bg-warning";
  return "bg-danger";
}

function gradeBadge(grade: string): string {
  const map: Record<string, string> = {
    A: "bg-success/10 text-success border-success/20",
    B: "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/20",
    C: "bg-warning/10 text-warning border-warning/20",
    D: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
    F: "bg-danger/10 text-danger border-danger/20",
  };
  return map[grade] || "";
}

/* ──────────────────────────── COMPONENT ──────────────────────────── */

export default function Analytics({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSort, setStudentSort] = useState<{
    key: string;
    dir: "asc" | "desc";
  }>({ key: "score", dir: "desc" });
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [questionSort, setQuestionSort] = useState<{
    key: string;
    dir: "asc" | "desc";
  }>({ key: "position", dir: "asc" });
  const [activeTab, setActiveTab] = useState<
    "overview" | "questions" | "students" | "time"
  >("overview");

  const fetchAnalytics = useCallback(async (isBackground = false) => {
    const res = await fetch(`/api/admin/exams/${examId}/analytics`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    if (!isBackground) {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchAnalytics(false);

    const supabase = createClient();
    let isRealtimeConnected = false;
    let fallbackInterval: ReturnType<typeof setTimeout> | undefined = undefined;
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    const scheduleRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        fetchAnalytics(true);
      }, 2000);
    };

    const channel = supabase
      .channel(`admin-analytics-realtime-${examId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exams", filter: `id=eq.${examId}` },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attempts", filter: `exam_id=eq.${examId}` },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_participants", filter: `exam_id=eq.${examId}` },
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
        const pollInterval = setInterval(() => fetchAnalytics(true), 5000);
        return () => clearInterval(pollInterval);
      }
    }, 10000);

    return () => {
      clearTimeout(fallbackInterval);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics, examId]);

  /* – Derived data – */

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    const q = studentSearch.toLowerCase();
    const filtered = data.studentResults.filter(
      (s) =>
        (s.name?.toLowerCase() || "").includes(q) ||
        (s.email?.toLowerCase() || "").includes(q) ||
        (s.college_id?.toLowerCase() || "").includes(q),
    );
    return [...filtered].sort((a, b) => {
      const key = studentSort.key as keyof StudentResult;
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return studentSort.dir === "asc"
          ? (aVal || "").localeCompare(bVal || "")
          : (bVal || "").localeCompare(aVal || "");
      }
      const nA = Number(aVal);
      const nB = Number(bVal);
      if (isNaN(nA) || isNaN(nB)) return 0;
      return studentSort.dir === "asc" ? nA - nB : nB - nA;
    });
  }, [data, studentSearch, studentSort]);

  const sortedQuestions = useMemo(() => {
    if (!data) return [];
    return [...data.detailedQuestions].sort((a, b) => {
      const key = questionSort.key as keyof DetailedQuestion;
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      const nA = Number(aVal);
      const nB = Number(bVal);
      if (isNaN(nA) || isNaN(nB)) return 0;
      return questionSort.dir === "asc" ? nA - nB : nB - nA;
    });
  }, [data, questionSort]);

  const gradeChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.gradeDistribution).map(([grade, count]) => ({
      name: `Grade ${grade}`,
      value: count,
      grade,
    }));
  }, [data]);

  /* – CSV Export – */

  const exportCSV = () => {
    if (!data) return;
    const headers =
      "Rank,Name,Email,College ID,Score,Max Score,Percentage,Grade,Time to Submit,Submitted At\n";
    const rows = data.studentResults
      .map(
        (s, i) =>
          `${i + 1},"${s.name}","${s.email}","${s.college_id}",${s.score},${s.max_score},${s.percentage}%,${s.grade},"${formatTime(s.timeToSubmitSeconds)}","${s.submitted_at || "—"}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = data.examMeta.title.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${safeTitle}-${data.examMeta.examCode}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!data) return;

    const { jsPDF: JsPDF, autoTable: AutoTable } = await lazyLoadPDF();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = new JsPDF();
    const { examMeta, summary, studentResults } = data;

    doc.setFontSize(20);
    doc.text("Examination Report", 14, 22);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${examMeta.title} (${examMeta.examCode})`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    doc.setDrawColor(200);
    doc.line(14, 42, 196, 42);
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Summary Statistics", 14, 50);
    
    AutoTable(doc, {
      startY: 55,
      head: [["Metric", "Value"]],
      body: [
        ["Total Participants", summary.totalParticipants.toString()],
        ["Total Submissions", summary.totalSubmitted.toString()],
        ["Average Score", `${summary.avgScore} / ${summary.maxPossible}`],
        ["Pass Rate", `${summary.passRate}%`],
        ["Completion Rate", `${summary.completionRate}%`],
      ],
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
    });

    const finalY1 = doc.lastAutoTable?.finalY ?? 100;
    doc.setFontSize(14);
    doc.text("Student Results", 14, finalY1 + 15);

    const tableData = studentResults.map((s, i) => [
      (i + 1).toString(),
      s.name,
      s.college_id,
      `${s.score}/${s.max_score}`,
      `${s.percentage}%`,
      s.grade,
      s.tab_switch_count.toString(),
      formatTime(s.timeToSubmitSeconds),
    ]);

    AutoTable(doc, {
      startY: finalY1 + 20,
      head: [["Rank", "Name", "ID", "Score", "%", "Grade", "Switches", "Time"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: {
        6: { fontStyle: 'bold', textColor: [220, 38, 38] }
      }
    });

    const safeTitle = examMeta.title.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${safeTitle}-${examMeta.examCode}-report.pdf`);
  };

  /* – Column sort handler – */
  const toggleStudentSort = (key: string) => {
    setStudentSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const toggleQuestionSort = (key: string) => {
    setQuestionSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  };

  const SortIcon = ({
    active,
    dir,
  }: {
    active: boolean;
    dir: "asc" | "desc";
  }) => (
    <svg
      className={`inline w-3 h-3 ml-1 ${active ? "text-primary" : "text-muted-foreground"}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {dir === "asc" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      )}
    </svg>
  );

  /* ──────────────────────────── RENDER ──────────────────────────── */

  if (loading || !data) {
    return (
      <div className="screen-loader">
        <div className="screen-loader-content">
          <div
            className="spinner mx-auto mb-4"
            style={{ width: 40, height: 40 }}
          />
          <p className="text-muted-foreground text-sm animate-pulse">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  const { examMeta, summary, timeAnalytics, examHealth } = data;

  const statusColors: Record<string, string> = {
    draft: "bg-muted/10 text-muted-foreground border-muted/20",
    waiting: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    closed: "bg-success/10 text-success border-success/20",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      {/* 1. EXAM HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <a
            href={`/admin/exams/${examId}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 inline-flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Control Panel
          </a>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{examMeta.title}</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium uppercase tracking-wider ${statusColors[examMeta.status] || ""}`}>
              {examMeta.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="font-mono font-medium text-foreground">{examMeta.examCode}</span>
            <span>•</span>
            <span>{Math.round(examMeta.durationSeconds / 60)} min</span>
            <span>•</span>
            <span>{summary.totalQuestions} questions</span>
            <span>•</span>
            <span>Created {new Date(examMeta.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="h-8 px-3 rounded-md text-xs font-medium bg-transparent border border-border hover:bg-muted text-foreground transition-colors flex items-center gap-2">
            Export CSV
          </button>
          <button onClick={exportPDF} className="h-8 px-3 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-2">
            Download Report
          </button>
        </div>
      </div>

      {/* 2. ANALYTICS NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-border/60">
        {(new Array("overview", "questions", "students", "time")).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            } capitalize`}
          >
            {tab === "overview" ? "Overview" : tab === "questions" ? "Questions" : tab === "students" ? "Student Results" : "Time Analysis"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ TAB: OVERVIEW ═══════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-10 animate-fade-in">
          {/* Compact Metrics Strip */}
          <div className="flex flex-wrap items-center justify-between border-b border-border/50 pb-6 gap-y-4">
            {[
              { label: "Avg Score", value: `${summary.avgScore}/${summary.maxPossible}`, sub: `${summary.maxPossible > 0 ? Math.round((summary.avgScore / summary.maxPossible) * 100) : 0}%` },
              { label: "High Score", value: `${summary.highestScore}`, sub: `${summary.maxPossible > 0 ? Math.round((summary.highestScore / summary.maxPossible) * 100) : 0}%` },
              { label: "Pass Rate", value: `${summary.passRate}%`, sub: `≥40% to pass` },
              { label: "Completion", value: `${summary.completionRate}%`, sub: "submitted/joined" },
              { label: "Avg Time", value: formatTime(timeAnalytics.avgTimeSeconds), sub: `of ${Math.round(examMeta.durationSeconds / 60)}m` },
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">{s.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-foreground tracking-tight">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Score Distribution */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-6 uppercase tracking-wider">Score Distribution</h3>
              <div className="h-64">
                <ScoreDistributionChart data={data.scoreDistribution} />
              </div>
            </div>

            {/* Topic Performance */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-6 uppercase tracking-wider">Topic Performance</h3>
              <div className="h-64">
                <TopicPerformanceChart data={data.topicPerformance} />
              </div>
            </div>
          </div>
          
          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4 border-t border-border/50">
            {/* Exam Health */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">Exam Health</h3>
              <div className="flex flex-col">
                {[
                  { label: "Hardest Question", detail: examHealth.hardestQuestion ? `Q${examHealth.hardestQuestion.position} — ${examHealth.hardestQuestion.correctPct}% correct` : "—" },
                  { label: "Easiest Question", detail: examHealth.easiestQuestion ? `Q${examHealth.easiestQuestion.position} — ${examHealth.easiestQuestion.correctPct}% correct` : "—" },
                  { label: "Most Skipped", detail: examHealth.mostSkipped ? `Q${examHealth.mostSkipped.position} — ${examHealth.mostSkipped.count} skips` : "—" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground font-mono">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">Difficulty Breakdown</h3>
              <div className="flex flex-col gap-4">
                {data.difficultyBreakdown.map((d) => (
                  <div key={d.difficulty} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-24">{d.difficulty}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-foreground rounded-full" style={{ width: `${d.avgCorrectPct}%` }} />
                    </div>
                    <span className="text-sm font-medium text-foreground w-10 text-right">{d.avgCorrectPct}%</span>
                  </div>
                ))}
                {data.difficultyBreakdown.length === 0 && (
                  <span className="text-sm text-muted-foreground">No data available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ TAB: QUESTIONS ═══════════════════════ */}
      {activeTab === "questions" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Question Analysis ({data.detailedQuestions.length})
            </h3>
            <p className="text-[10px] text-muted-foreground">Click a row to expand details</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {[
                    { key: "position", label: "#", w: "w-12" },
                    { key: "questionText", label: "Question", w: "w-1/3" },
                    { key: "topic", label: "Topic", w: "" },
                    { key: "difficulty", label: "Difficulty", w: "" },
                    { key: "correctPercentage", label: "Correct %", w: "" },
                    { key: "correctCount", label: "Correct", w: "" },
                    { key: "wrongCount", label: "Wrong", w: "" },
                    { key: "skippedCount", label: "Skipped", w: "" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`text-left py-3 px-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors ${col.w}`}
                      onClick={() => toggleQuestionSort(col.key)}
                    >
                      {col.label}
                      <SortIcon active={questionSort.key === col.key} dir={questionSort.dir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedQuestions.map((q) => (
                  <Fragment key={q.questionId}>
                    <tr
                      className={`border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer`}
                      onClick={() => setExpandedQ(expandedQ === q.questionId ? null : q.questionId)}
                    >
                      <td className="py-3 px-2 font-mono text-muted-foreground text-xs">{q.position}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {q.questionType === "programming" && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg bg-primary/10 text-primary flex-shrink-0">Code</span>
                          )}
                          <p className="text-foreground line-clamp-1 text-sm">{q.questionText}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{q.topic}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{q.difficulty}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium ${pctColor(q.correctPercentage)}`}>{q.correctPercentage}%</span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{q.correctCount}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{q.wrongCount}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{q.skippedCount}</td>
                    </tr>
                    {expandedQ === q.questionId && (
                      <tr className="bg-muted/10 border-b border-border/30">
                        <td colSpan={8} className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Full Question</p>
                              {q.questionType === "programming" ? (
                                <div className="text-sm text-foreground [&_p]:mb-2 [&_p]:leading-relaxed [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_code]:font-mono [&_pre]:bg-muted/30 [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre]:border [&_pre]:border-border/50 [&_pre]:text-[13px]">
                                  <MarkdownViewer content={q.questionText} />
                                </div>
                              ) : (
                                <p className="text-sm text-foreground bg-background p-4 rounded-md border border-border/50">{q.questionText}</p>
                              )}
                              {q.codeSnippet && <pre className="code-block mt-3 text-xs p-4 rounded-md bg-background border border-border/50">{q.codeSnippet}</pre>}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Response Distribution</p>
                              <div className="space-y-3">
                                {q.questionType === "programming" && q.codingMetrics ? (
                                  <div className="text-sm text-muted-foreground">Programming metrics available in detailed view.</div>
                                ) : (
                                  (["A", "B", "C", "D"] as const).map((optId) => {
                                    const count = q.optionBreakdown[optId as keyof typeof q.optionBreakdown] || 0;
                                    const total = q.optionBreakdown.A + q.optionBreakdown.B + q.optionBreakdown.C + q.optionBreakdown.D;
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                    const isCorrect = optId === q.correctOptionId;
                                    return (
                                      <div key={optId} className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isCorrect ? "bg-success text-white shadow-sm shadow-success/30" : "bg-muted text-muted-foreground"}`}>
                                          {isCorrect ? "✓" : optId}
                                        </span>
                                        <div className="flex-1">
                                          <div className={`${isCorrect ? "h-3.5" : "h-1.5"} bg-muted rounded-full overflow-hidden ${isCorrect ? "ring-2 ring-success/20" : ""}`}>
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                isCorrect
                                                  ? "bg-gradient-to-r from-success to-emerald-400 shadow-sm shadow-success/30"
                                                  : "bg-muted-foreground/40"
                                              }`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 w-20 justify-end">
                                          <span className={`text-xs font-bold ${isCorrect ? "text-success" : "text-foreground"}`}>{pct}%</span>
                                          {isCorrect && <span className="text-[9px] text-success/70 font-semibold uppercase tracking-wider">Correct</span>}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ TAB: STUDENTS ═══════════════════════ */}
      {activeTab === "students" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Student Leaderboard ({data.studentResults.length})
            </h3>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search students..."
              className="h-8 px-3 rounded-md bg-transparent border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors w-full sm:w-64"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {[
                    { key: "rank", label: "Rank" },
                    { key: "name", label: "Name" },
                    { key: "college_id", label: "College ID" },
                    { key: "score", label: "Score" },
                    { key: "percentage", label: "%" },
                    { key: "grade", label: "Grade" },
                    { key: "timeToSubmitSeconds", label: "Time Taken" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="text-left py-3 px-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => col.key !== "rank" && toggleStudentSort(col.key)}
                    >
                      {col.label}
                      {col.key !== "rank" && <SortIcon active={studentSort.key === col.key} dir={studentSort.dir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 text-xs font-mono text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-2 text-sm font-medium text-foreground">{s.name}</td>
                    <td className="py-3 px-2 text-xs font-mono text-muted-foreground">{s.college_id}</td>
                    <td className="py-3 px-2 text-sm font-medium text-foreground">{s.score}/{s.max_score}</td>
                    <td className="py-3 px-2 text-sm text-foreground">{s.percentage}%</td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${gradeBadge(s.grade)}`}>{s.grade}</span>
                    </td>
                    <td className="py-3 px-2 text-xs font-mono text-muted-foreground">{formatTime(s.timeToSubmitSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ TAB: TIME ANALYSIS ═══════════════════════ */}
      {activeTab === "time" && (
        <div className="space-y-12 animate-fade-in pt-4">
          {/* 1. Operational Distribution Bar */}
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">Operational Distribution</h3>
            <div className="flex h-5 rounded-sm overflow-hidden bg-muted">
              <div 
                style={{ width: `${(timeAnalytics.earlySubmissions / Math.max(1, summary.totalSubmitted)) * 100}%` }} 
                className="bg-foreground border-r border-background hover:opacity-90 transition-opacity" 
                title="Early Finishers" 
              />
              <div 
                style={{ width: `${(timeAnalytics.onTimeSubmissions / Math.max(1, summary.totalSubmitted)) * 100}%` }} 
                className="bg-muted-foreground border-r border-background hover:opacity-90 transition-opacity" 
                title="Standard" 
              />
              <div 
                style={{ width: `${(timeAnalytics.lateSubmissions / Math.max(1, summary.totalSubmitted)) * 100}%` }} 
                className="bg-border hover:opacity-90 transition-opacity" 
                title="Last Minute" 
              />
            </div>
            <div className="flex justify-between mt-3 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-foreground"/> 
                <span className="text-muted-foreground uppercase tracking-wider">Early Finishers</span> 
                <span className="font-semibold text-foreground">{timeAnalytics.earlySubmissions}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-muted-foreground"/> 
                <span className="text-muted-foreground uppercase tracking-wider">Standard Window</span> 
                <span className="font-semibold text-foreground">{timeAnalytics.onTimeSubmissions}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-border"/> 
                <span className="text-muted-foreground uppercase tracking-wider">Last Minute</span> 
                <span className="font-semibold text-foreground">{timeAnalytics.lateSubmissions}</span>
              </div>
            </div>
          </div>

          {/* 2. Practical Insights (Speed & Proficiency Outliers) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10 pt-10 border-t border-border/50">
            {/* Speedrun Identification */}
            <div>
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Speedrun Analysis</h3>
                <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Students finishing in under 50% of the allowed duration. Flag for review if accuracy is abnormally high.</p>
              </div>
              <div className="flex flex-col">
                {data.studentResults
                  .filter(s => s.timeToSubmitSeconds && s.timeToSubmitSeconds < (timeAnalytics.examDurationSeconds * 0.5))
                  .sort((a, b) => (a.timeToSubmitSeconds || 0) - (b.timeToSubmitSeconds || 0))
                  .slice(0, 8)
                  .map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">{s.college_id}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-foreground font-mono tracking-tight">{formatTime(s.timeToSubmitSeconds)}</span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold ${pctColor(s.percentage)}`}>{s.percentage}%</span>
                          <span className="text-[9px] text-muted-foreground uppercase">Score</span>
                        </div>
                      </div>
                    </div>
                  ))}
                {data.studentResults.filter(s => s.timeToSubmitSeconds && s.timeToSubmitSeconds < (timeAnalytics.examDurationSeconds * 0.5)).length === 0 && (
                  <span className="text-xs text-muted-foreground italic py-4">No speedrun outliers detected in this session.</span>
                )}
              </div>
            </div>

            {/* Endurance / Struggle Identification */}
            <div>
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Last-Mile Submissions</h3>
                <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Students who utilized over 90% of the duration. Often indicates high commitment or struggle with complexity.</p>
              </div>
              <div className="flex flex-col">
                {data.studentResults
                  .filter(s => s.timeToSubmitSeconds && s.timeToSubmitSeconds >= (timeAnalytics.examDurationSeconds * 0.9))
                  .sort((a, b) => (b.timeToSubmitSeconds || 0) - (a.timeToSubmitSeconds || 0))
                  .slice(0, 8)
                  .map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">{s.college_id}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-foreground font-mono tracking-tight">{formatTime(s.timeToSubmitSeconds)}</span>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold ${pctColor(s.percentage)}`}>{s.percentage}%</span>
                          <span className="text-[9px] text-muted-foreground uppercase">Score</span>
                        </div>
                      </div>
                    </div>
                  ))}
                {data.studentResults.filter(s => s.timeToSubmitSeconds && s.timeToSubmitSeconds >= (timeAnalytics.examDurationSeconds * 0.9)).length === 0 && (
                  <span className="text-xs text-muted-foreground italic py-4">No students submitted in the final 10% of time.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
