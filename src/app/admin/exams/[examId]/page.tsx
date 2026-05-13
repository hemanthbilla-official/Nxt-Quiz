"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ExamData, Participant } from "./types";
import ExamHeader from "./ExamHeader";
import QuestionUpload from "./QuestionUpload";
import ParticipantsTable from "./ParticipantsTable";
import ExamSidebar from "./ExamSidebar";
import EditExamModal from "./EditExamModal";

export default function ExamControl({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    capacity: number | string;
    durationMinutes: number | string;
  }>({ title: "", capacity: "", durationMinutes: "" });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}`);
      if (res.status === 403) {
        router.push("/admin/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch exam data");
      }

      const data = await res.json();

      const qRes = await fetch(`/api/admin/exams/${examId}/questions-count`);
      const { count } = qRes.ok ? await qRes.json() : { count: 0 };

      const examData = { ...data.exam, questionsCount: count };
      setExam(examData);
      setParticipants(data.participants || []);
      if (!isEditModalOpen) {
        setEditForm({
          title: data.exam.title,
          capacity: data.exam.capacity,
          durationMinutes: Math.round(data.exam.duration_seconds / 60),
        });
      }

      // Calculate time left if in progress
      if (data.exam.status === "in_progress" && data.exam.starts_at) {
        const startsAt = new Date(data.exam.starts_at).getTime();
        const durationMs = data.exam.duration_seconds * 1000;
        const now = Date.now();
        const remaining = Math.max(
          0,
          Math.floor((startsAt + durationMs - now) / 1000),
        );
        setTimeLeft(remaining);
      } else {
        setTimeLeft(null);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load exam details. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || exam?.status !== "in_progress")
      return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, exam?.status]);

  // Auto-end the exam when the timer reaches zero
  useEffect(() => {
    if (timeLeft === 0 && exam?.status === "in_progress") {
      const autoEnd = async () => {
        setEnding(true);
        const res = await fetch(`/api/exam/${examId}/end`, { method: "POST" });
        if (res.ok) fetchData();
        setEnding(false);
      };
      autoEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, exam?.status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const questionsToImport = Array.isArray(json) ? json : [json];

      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questionsToImport, examId }),
      });

      if (res.ok) {
        alert("Questions uploaded and linked successfully!");
        fetchData();
      } else {
        const d = await res.json();
        alert("Upload failed: " + (d.error || "Unknown error"));
      }
    } catch {
      alert("Invalid JSON file format.");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    fetchData();
    if (!isEditModalOpen) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, isEditModalOpen]);

  const handleStart = async () => {
    if (
      !confirm(
        "Start the exam for all waiting students? This cannot be undone.",
      )
    )
      return;
    setStarting(true);
    const res = await fetch(`/api/exam/${examId}/start`, { method: "POST" });
    if (res.ok) fetchData();
    setStarting(false);
  };

  const handleEnd = async () => {
    if (
      !confirm(
        "End the exam now? All active attempts will be auto-submitted with their current answers. This cannot be undone.",
      )
    )
      return;
    setEnding(true);
    const res = await fetch(`/api/exam/${examId}/end`, { method: "POST" });
    if (res.ok) fetchData();
    setEnding(false);
  };

  const handleDeleteExam = async () => {
    if (
      !confirm(
        "PERMANENTLY DELETE this exam and all student attempts? This cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/admin/exams/${examId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
    } else {
      setDeleting(false);
      alert("Failed to delete exam");
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetch(`/api/admin/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      await fetchData();
      setIsSaving(false);
      setIsEditModalOpen(false);
    } else {
      setIsSaving(false);
      alert("Failed to update exam");
    }
  };

  const handleKick = async (userId: string, name: string) => {
    if (!confirm(`Kick student "${name}" from the exam?`)) return;
    setActionLoading(userId);
    const res = await fetch(`/api/admin/exams/${examId}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) fetchData();
    setActionLoading(null);
  };

  const handleReset = async (userId: string, name: string) => {
    if (
      !confirm(
        `Reset all answers and attempts for "${name}"? They will be able to start over.`,
      )
    )
      return;
    setActionLoading(userId);
    const res = await fetch(`/api/admin/exams/${examId}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) fetchData();
    setActionLoading(null);
  };

  // --- Loading & Error States ---

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="screen-loader-content">
          <div
            className="spinner mx-auto mb-4"
            style={{ width: 40, height: 40 }}
          />
          <p className="text-muted-foreground animate-pulse">
            Loading controls...
          </p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="glass-card p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            Error Loading Exam
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error || "Exam not found"}
          </p>
          <button
            onClick={() => fetchData()}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --- Derived Data ---

  const waitingCount = participants.filter(
    (p) => p.status === "waiting",
  ).length;
  const activeCount = participants.filter((p) => p.status === "active").length;
  const submittedCount = participants.filter(
    (p) => p.status === "submitted",
  ).length;

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      (p.profiles?.full_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (p.profiles?.email || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (p.profiles?.student_college_id || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter ? p.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  // --- Render ---

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <ExamHeader
        exam={exam}
        waitingCount={waitingCount}
        activeCount={activeCount}
        submittedCount={submittedCount}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Workspace */}
        <div className="flex-1 space-y-6">
          <QuestionUpload
            exam={exam}
            waitingCount={waitingCount}
            isImporting={isImporting}
            onImport={handleImport}
          />

          <ParticipantsTable
            participants={participants}
            filteredParticipants={filteredParticipants}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            actionLoading={actionLoading}
            onKick={handleKick}
            onReset={handleReset}
          />
        </div>

        {/* Sidebar */}
        <ExamSidebar
          exam={exam}
          examId={examId}
          waitingCount={waitingCount}
          timeLeft={timeLeft}
          formatTime={formatTime}
          starting={starting}
          ending={ending}
          deleting={deleting}
          onStart={handleStart}
          onEnd={handleEnd}
          onDelete={handleDeleteExam}
          onOpenEdit={() => setIsEditModalOpen(true)}
        />
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditExamModal
          editForm={editForm}
          isSaving={isSaving}
          onFormChange={setEditForm}
          onSubmit={handleUpdateExam}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
