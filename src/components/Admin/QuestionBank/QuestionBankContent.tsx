"use client";

import { useState, useEffect, useCallback } from "react";
import type { Question } from "@/lib/quizTypes";
import { QuestionList } from "./QuestionList";
import { QuestionFormModal } from "./QuestionFormModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";

export const defaultForm: Partial<Question> = {
  topic: "React",
  difficulty: "Basic",
  question_type: "theory",
  question: "",
  code_snippet: "",
  options: [
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
    { id: "D", text: "" },
  ],
  correct_option_id: "A",
  explanation: "",
  tags: [],
  points: 1,
  starter_code: "",
  function_name: "",
  challenge_mode: "function",
  test_cases: [{ id: "tc1", name: "Test 1", input: [], expected: "" }],
  language: "javascript",
};

export function QuestionBankContent() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "info" | "warning" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info",
  });
  const [isHardResetModalOpen, setIsHardResetModalOpen] = useState(false);
  const [hardResetInput, setHardResetInput] = useState("");

  const [form, setForm] = useState<Partial<Question>>(defaultForm);

  const handleDownloadTemplate = () => {
    const template = [
      {
        id: "unique-id-1",
        topic: "React Hooks",
        difficulty: "Basic",
        questionType: "theory",
        question: "What does useState return?",
        options: [
          { id: "A", text: "A single value" },
          { id: "B", text: "An array with two items" },
          { id: "C", text: "An object with state and setter" },
          { id: "D", text: "A function only" },
        ],
        correctOptionId: "B",
        explanation:
          "useState returns an array containing the current state and a function to update it.",
        tags: ["hooks", "basics"],
      },
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz_template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchQuestions = useCallback(async () => {
    const res = await fetch("/api/admin/questions");
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editingId
      ? `/api/admin/questions/${editingId}`
      : "/api/admin/questions";
    const method = editingId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchQuestions();
        toast.success(editingId ? "Question updated" : "Question created");
        setEditingId(null);
        setShowAdd(false);
        setForm({ ...defaultForm });
      } else {
        toast.error("Failed to save question");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Question",
      message: "Are you sure? This will remove the question from all exams.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("Question deleted");
          fetchQuestions();
        } else {
          toast.error("Failed to delete question");
        }
      }
    });
  };

  const handleHardReset = async () => {
    if (hardResetInput !== "WIPE EVERYTHING") {
      toast.warning("Verification text doesn't match");
      return;
    }

    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/admin/hard-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "WIPE DATABASE" }),
      });
      if (res.ok) {
        toast.success("Database wiped successfully");
        setIsHardResetModalOpen(false);
        setHardResetInput("");
        fetchQuestions();
      } else {
        toast.error("Wipe failed");
      }
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleEdit = (q: Question) => {
    setForm({
      ...q,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [],
      test_cases: q.test_cases || [{ id: "tc1", name: "Test 1", input: [], expected: "" }],
    });
    setEditingId(q.id);
    setShowAdd(true);
  };

  const [selectedExamName, setSelectedExamName] = useState<string>("All");

  const filtered = questions.filter(
    (q) =>
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase())
  );

  const groupedQuestions = filtered.reduce(
    (acc, q) => {
      if (!q.exam_questions || q.exam_questions.length === 0) {
        const label = "Unassigned / Global Pool";
        if (!acc[label]) acc[label] = [];
        acc[label].push(q);
      } else {
        q.exam_questions.forEach((eq) => {
          const parentExam = eq.exams;
          const label = parentExam
            ? `${parentExam.title} (${parentExam.exam_code})`
            : "Unassigned / Global Pool";
          if (!acc[label]) acc[label] = [];
          if (!acc[label].find((existing) => existing.id === q.id)) {
            acc[label].push(q);
          }
        });
      }
      return acc;
    },
    {} as Record<string, Question[]>
  );

  const availableExams = Object.keys(groupedQuestions).sort();

  if (loading) {
    return (
      <div className="screen-loader">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} questions available
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={selectedExamName}
            onChange={(e) => setSelectedExamName(e.target.value)}
            className="px-4 py-2 rounded bg-background border border-border text-sm font-semibold focus:outline-none focus:border-primary transition-all w-full sm:w-64 shadow-sm"
          >
            <option value="" disabled>
              Select an Exam...
            </option>
            <option value="All">All Exams</option>
            {availableExams.map((exam) => (
              <option key={exam} value={exam}>
                {exam}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded bg-background border border-border text-sm w-full sm:w-48 focus:outline-none focus:border-primary transition-all shadow-sm"
          />
          {questions.length > 0 && process.env.NEXT_PUBLIC_ENVIRONMENT === "local" && (
            <button
              onClick={() => setIsHardResetModalOpen(true)}
              disabled={isDeletingAll}
              className="px-4 py-2 rounded text-xs font-bold text-danger hover:bg-danger/10 border border-danger/20 transition-all flex items-center gap-2 shadow-sm"
            >
              {isDeletingAll ? (
                <>
                  <div className="spinner" style={{ width: 12, height: 12 }} />
                  Wiping...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Hard Reset
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 rounded text-xs font-semibold bg-card border border-border text-foreground hover:bg-card-hover transition-all flex items-center gap-2 shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Download Template
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setShowAdd(true);
            }}
            className="px-4 py-2 rounded text-xs font-bold bg-primary text-primary-foreground transition-all shadow-md"
          >
            + Add Question
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <QuestionList
          groupedQuestions={groupedQuestions}
          selectedExamName={selectedExamName}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
        />
      </div>

      {showAdd && (
        <QuestionFormModal
          form={form}
          setForm={setForm}
          handleSubmit={handleSubmit}
          editingId={editingId}
          setShowAdd={setShowAdd}
          submitting={submitting}
        />
      )}

      {/* Hard Reset Modal */}
      {isHardResetModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">System Hard Reset</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                CRITICAL: This will PERMANENTLY delete ALL exams, ALL student attempts, and ALL questions from the entire database. This action cannot be reversed.
              </p>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type &quot;WIPE EVERYTHING&quot; to confirm</label>
                <input 
                  type="text"
                  value={hardResetInput}
                  onChange={e => setHardResetInput(e.target.value)}
                  placeholder="Verification text"
                  className="input w-full h-12 border-danger/30 focus:border-danger focus:ring-danger/5"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => { setIsHardResetModalOpen(false); setHardResetInput(""); }}
                  className="btn-secondary flex-1 h-11"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleHardReset}
                  disabled={isDeletingAll || hardResetInput !== "WIPE EVERYTHING"}
                  className="btn-destructive flex-1 h-11 shadow-lg shadow-danger/20"
                >
                  {isDeletingAll ? "Wiping..." : "WIPE DATABASE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
