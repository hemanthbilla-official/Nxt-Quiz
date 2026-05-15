"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  PlusCircle, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Database, 
  X,
  AlertTriangle
} from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { toast } from "react-toastify";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  topic: string;
  difficulty: string;
  question_type: string;
  question: string;
  code_snippet: string | null;
  options: Option[];
  correct_option_id: string;
  explanation: string;
  tags: string[];
  exam_questions?: {
    exams?: { id: string; title: string; exam_code: string };
  }[];
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState<Partial<Question>>({
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
  });

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

  const [isHardResetting, setIsHardReset_Modal] = useState(false);
  const [hardResetInput, setHardResetInput] = useState("");

  const toggleSection = (sectionName: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllQuestionsInSection = (examName: string, qs: Question[]) => {
    const sectionQs = qs.map(q => q.id);
    const allSelected = sectionQs.length > 0 && sectionQs.every(id => selectedQuestions[id]);
    const next = { ...selectedQuestions };
    sectionQs.forEach(id => next[id] = !allSelected);
    setSelectedQuestions(next);
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/questions");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
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
        toast.success(editingId ? "Question updated" : "Question created");
        await fetchQuestions();
        setEditingId(null);
        setShowAdd(false);
        setForm({
          topic: "React",
          difficulty: "Basic",
          question: "",
          options: [
            { id: "A", text: "" },
            { id: "B", text: "" },
            { id: "C", text: "" },
            { id: "D", text: "" },
          ],
          correct_option_id: "A",
          explanation: "",
          tags: [],
        });
      } else {
        toast.error("Failed to save question");
      }
    } finally {
      setSubmitting(false);
    }
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
        setIsHardReset_Modal(false);
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
      options:
        typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    });
    setEditingId(q.id);
    setShowAdd(true);
  };

  const [selectedExamName, setSelectedExamName] = useState<string>("All");

  const filtered = questions.filter(
    (q) =>
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase()),
  );

  const groupedQuestions = filtered.reduce(
    (acc, q) => {
      if (q.exam_questions && q.exam_questions.length > 0) {
        q.exam_questions.forEach((eq) => {
          const parentExam = eq.exams;
          if (parentExam) {
            const label = `${parentExam.title} (${parentExam.exam_code})`;
            if (!acc[label]) acc[label] = [];
            if (!acc[label].find((existing) => existing.id === q.id)) {
              acc[label].push(q);
            }
          }
        });
      }
      return acc;
    },
    {} as Record<string, Question[]>,
  );

  const availableExams = Object.keys(groupedQuestions).sort();

  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});

  const selectedCount = Object.values(selectedQuestions).filter(Boolean).length;

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedQuestions).filter(id => selectedQuestions[id]);
    if (ids.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Bulk Delete",
      message: `Are you sure you want to delete ${ids.length} selected questions? This will remove them from all exams.`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        try {
          const res = await fetch("/api/admin/questions/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionIds: ids }),
          });
          if (res.ok) {
            toast.success(`Deleted ${ids.length} questions`);
            setSelectedQuestions({});
            await fetchQuestions();
          } else {
            toast.error("Failed to delete questions");
          }
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteConfirmed = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Question deleted");
        await fetchQuestions();
      } else {
        toast.error("Delete failed");
      }
    } finally {
      setSubmitting(false);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner h-8 w-8" />
      </div>
    );
  }

  const visibleEntries = selectedExamName === "All"
    ? Object.entries(groupedQuestions)
    : Object.entries(groupedQuestions).filter(([n]) => n === selectedExamName);

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      {/* Floating Bulk Actions */}
      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="bg-foreground text-background px-5 py-2.5 rounded-lg shadow-2xl flex items-center gap-4 border border-border/10">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="h-4 w-px bg-background/20" />
            <button 
              onClick={handleBulkDelete}
              disabled={submitting}
              className="text-sm font-medium text-danger hover:text-danger/80"
            >
              Delete
            </button>
            <button 
              onClick={() => setSelectedQuestions({})}
              className="text-sm font-medium hover:opacity-80"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage assessment content across all exams</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative group w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full"
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>
          
          <select
            value={selectedExamName}
            onChange={(e) => setSelectedExamName(e.target.value)}
            className="input w-auto"
          >
            <option value="All">All Exams</option>
            {availableExams.map(exam => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>

          <button
            onClick={() => { setEditingId(null); setShowAdd(true); }}
            className="btn-primary h-9 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          <button
            onClick={() => setIsHardReset_Modal(true)}
            className="btn-ghost h-9 w-9 p-0 text-danger hover:bg-danger/5"
            title="System Hard Reset"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {visibleEntries.map(([examName, qs]) => {
          const isOpen = openSections[examName] ?? false;
          const sectionQs = qs.map(q => q.id);
          const allInSectionSelected = sectionQs.length > 0 && sectionQs.every(id => selectedQuestions[id]);

          return (
            <div key={examName} className="card overflow-hidden">
              <div 
                className="p-4 bg-muted/30 flex items-center gap-3 cursor-pointer select-none"
                onClick={() => toggleSection(examName)}
              >
                <input
                  type="checkbox"
                  checked={allInSectionSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleAllQuestionsInSection(examName, qs);
                  }}
                  className="w-4 h-4 rounded border-border"
                  onClick={e => e.stopPropagation()}
                />
                <div className={`transition-transform duration-150 ${isOpen ? "rotate-0" : "-rotate-90"}`}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
                <h2 className="flex-1 font-semibold text-sm">{examName}</h2>
                <span className="badge badge-accent text-[10px]">
                  {qs.length}
                </span>
              </div>
              
              {isOpen && (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar sticky-table">
                  <table className="w-full text-sm">
                    <thead className="bg-card border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="table-header-cell w-10"></th>
                        <th className="table-header-cell">Question</th>
                        <th className="table-header-cell">Topic</th>
                        <th className="table-header-cell">Difficulty</th>
                        <th className="table-header-cell text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qs.map((q) => {
                        const isSelected = !!selectedQuestions[q.id];
                        const isConfirmingDelete = deleteConfirmId === q.id;
                        return (
                          <tr 
                            key={q.id} 
                            className={`border-b border-border hover:bg-card-hover transition-colors ${isSelected ? "bg-accent/5" : ""}`}
                          >
                            <td className="table-cell">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuestionSelection(q.id)}
                                className="w-4 h-4 rounded border-border"
                              />
                            </td>
                            <td className="table-cell">
                              <div className="max-w-md">
                                <p className="font-medium text-foreground line-clamp-1 text-sm">{q.question}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {q.id}
                                </p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="badge badge-default">
                                {q.topic}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className={`badge ${
                                q.difficulty === "Basic" ? "badge-success" : q.difficulty === "Intermediate" ? "badge-warning" : "badge-danger"
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isConfirmingDelete ? (
                                  <div className="flex items-center gap-1.5 animate-fade-in">
                                    <button 
                                      onClick={() => handleDeleteConfirmed(q.id)}
                                      className="px-2 py-1 bg-danger text-white rounded-md text-[11px] font-medium hover:bg-danger/90 transition-colors"
                                    >
                                      Delete
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-2 py-1 bg-muted rounded-md text-[11px] font-medium hover:bg-card-hover transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEdit(q)}
                                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(q.id)}
                                      className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger-muted rounded-md transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {visibleEntries.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">
              {search ? `No questions matching "${search}"` : "The question bank is empty"}
            </h2>
            <p className="text-muted-foreground max-w-sm mt-2">
              {search ? "Try searching for a different term or clear the filter." : "Start by adding your first question or importing a question set."}
            </p>
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="mt-6 btn-secondary"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowAdd(false)}
          />
          <div className="modal-content max-w-3xl max-h-[90vh] flex flex-col relative">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingId ? "Edit Question" : "Add Question"}
              </h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Topic</label>
                  <input
                    required
                    type="text"
                    value={form.topic}
                    onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="input w-full h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="input w-full h-10"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Question Type</label>
                <div className="flex gap-4">
                  {["theory", "code-output", "programming"].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, question_type: type }))}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                        form.question_type === type 
                          ? "bg-accent/10 border-accent text-accent" 
                          : "border-border text-muted-foreground hover:border-border-hover"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Question Body</label>
                <textarea
                  required
                  rows={4}
                  value={form.question}
                  onChange={e => setForm(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full p-3 bg-input-bg border border-border rounded-md focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/5 transition-all resize-none text-sm"
                  placeholder="Enter the question text..."
                />
              </div>

              {(form.question_type === "code-output" || form.question_type === "programming") && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Code Snippet</label>
                  <textarea
                    rows={6}
                    value={form.code_snippet || ""}
                    onChange={e => setForm(prev => ({ ...prev, code_snippet: e.target.value }))}
                    className="w-full p-3 bg-muted/30 border border-border rounded-md font-mono text-sm focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/5 transition-all resize-none"
                    placeholder="// Enter code here..."
                  />
                </div>
              )}

              {form.question_type !== "programming" && (
                <div className="space-y-4">
                  <label className="text-xs font-medium text-muted-foreground">Options</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(form.options || []).map((opt, idx) => (
                      <div key={opt.id} className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, correct_option_id: opt.id }))}
                          className={`w-10 h-10 rounded-md border-2 font-semibold text-sm transition-all ${
                            form.correct_option_id === opt.id 
                              ? "bg-success border-success text-white" 
                              : "border-border text-muted-foreground hover:border-border-hover"
                          }`}
                        >
                          {opt.id}
                        </button>
                        <input
                          required
                          type="text"
                          value={opt.text}
                          onChange={e => {
                            const next = [...(form.options || [])];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setForm(prev => ({ ...prev, options: next }));
                          }}
                          className="input h-10 flex-1"
                          placeholder={`Option ${opt.id}...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Explanation</label>
                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={e => setForm(prev => ({ ...prev, explanation: e.target.value }))}
                  className="w-full p-3 bg-input-bg border border-border rounded-md focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/5 transition-all resize-none text-sm"
                  placeholder="Explain the correct answer..."
                />
              </div>

              <div className="pt-4 border-t border-border flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="btn-secondary flex-1 h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 h-10"
                >
                  {submitting && <div className="spinner h-4 w-4" style={{ borderTopColor: 'white' }} />}
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Reset Modal */}
      {isHardResetting && (
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
                  onClick={() => { setIsHardReset_Modal(false); setHardResetInput(""); }}
                  className="btn-secondary flex-1 h-11"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleHardReset}
                  disabled={isDeletingAll || hardResetInput !== "WIPE EVERYTHING"}
                  className="btn-destructive flex-1 h-11"
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
