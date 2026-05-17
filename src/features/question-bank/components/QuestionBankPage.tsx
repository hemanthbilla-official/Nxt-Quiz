"use client";

import { useState } from "react";
import { Search, PlusCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import type { Question } from "@/types";
import { useQuestionBank, useQuestionFilters, useBulkSelection } from "../hooks";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { QuestionFormModal } from "@/components/Admin/QuestionBank/QuestionFormModal";

interface QuestionBankPageProps {
  showHardReset?: boolean;
}

const defaultForm: Partial<Question> = {
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

export function QuestionBankPage({ showHardReset = true }: QuestionBankPageProps) {
  const { questions, loading, refresh, createQuestion, updateQuestion, deleteQuestion, bulkDelete, hardReset } = useQuestionBank();
  const { search, setSearch, selectedExam, setSelectedExam, groupedQuestions, availableExams } = useQuestionFilters(questions);
  const { selected, toggleSelection, toggleAllInGroup, clearSelection, selectedCount, isAllSelected } = useBulkSelection();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<Question>>(defaultForm);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "info" | "warning" | "danger";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "info" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isHardResetting, setIsHardResetting] = useState(false);
  const [hardResetInput, setHardResetInput] = useState("");
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  const visibleEntries =
    selectedExam === "All"
      ? Object.entries(groupedQuestions)
      : Object.entries(groupedQuestions).filter(([n]) => n === selectedExam);

  const toggleExam = (name: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = editingId
      ? await updateQuestion(editingId, form)
      : await createQuestion(form);

    if (success) {
      toast.success(editingId ? "Question updated" : "Question created");
      setEditingId(null);
      setShowAdd(false);
      setForm(defaultForm);
    } else {
      toast.error("Failed to save question");
    }
    setSubmitting(false);
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

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmId) return;
    setSubmitting(true);
    const success = await deleteQuestion(deleteConfirmId);
    if (success) {
      toast.success("Question deleted");
    } else {
      toast.error("Failed to delete");
    }
    setSubmitting(false);
    setDeleteConfirmId(null);
  };

  const handleBulkDelete = () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (ids.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Bulk Delete",
      message: `Are you sure you want to delete ${ids.length} selected questions?`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        const success = await bulkDelete(ids);
        if (success) {
          toast.success(`Deleted ${ids.length} questions`);
          clearSelection();
        } else {
          toast.error("Failed to delete questions");
        }
        setSubmitting(false);
      },
    });
  };

  const handleHardReset = async () => {
    if (hardResetInput !== "WIPE EVERYTHING") {
      toast.warning("Verification text doesn't match");
      return;
    }
    setIsHardResetting(true);
    const success = await hardReset();
    if (success) {
      toast.success("Database wiped successfully");
      setIsHardResetting(false);
      setHardResetInput("");
    } else {
      toast.error("Wipe failed");
    }
    setIsHardResetting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="bg-foreground text-background px-5 py-2.5 rounded-lg shadow-2xl flex items-center gap-4 border border-border/10">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <div className="h-4 w-px bg-background/20" />
            <button onClick={handleBulkDelete} disabled={submitting} className="text-sm font-medium text-danger hover:text-danger/80">
              Delete
            </button>
            <button onClick={clearSelection} className="text-sm font-medium hover:opacity-80">
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

          <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="input w-auto">
            <option value="All">All Exams</option>
            {availableExams.map((exam) => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>

          <button onClick={() => { setEditingId(null); setShowAdd(true); }} className="btn-primary h-9 flex-shrink-0">
            <PlusCircle className="w-4 h-4" />
            <span>Add Question</span>
          </button>

          {showHardReset && process.env.NEXT_PUBLIC_ENVIRONMENT === "local" && (
            <button onClick={() => setIsHardResetting(true)} className="btn-ghost h-9 w-9 p-0 text-danger hover:bg-danger/5" title="System Hard Reset">
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {visibleEntries.map(([examName, qs]) => {
          const sectionQs = qs.map((q) => q.id);
          const allInSectionSelected = isAllSelected(sectionQs);

          return (
            <div key={examName} className="card overflow-hidden">
              <div
                onClick={() => toggleExam(examName)}
                className="p-4 bg-muted/30 flex items-center gap-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={allInSectionSelected}
                    onChange={() => toggleAllInGroup(sectionQs)}
                    className="w-4 h-4 rounded border-border"
                  />
                </div>
                <h2 className="flex-1 font-semibold text-sm">{examName}</h2>
                <span className="badge badge-accent text-[10px]">{qs.length}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    expandedExams.has(examName) ? "" : "-rotate-90"
                  }`}
                />
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedExams.has(examName) ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="overflow-x-auto custom-scrollbar">
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
                        const isSelected = !!selected[q.id];
                        const isConfirmingDelete = deleteConfirmId === q.id;
                        return (
                          <tr key={q.id} className={`border-b border-border hover:bg-card-hover transition-colors ${isSelected ? "bg-accent/5" : ""}`}>
                            <td className="table-cell">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(q.id)} className="w-4 h-4 rounded border-border" />
                            </td>
                            <td className="table-cell">
                              <div className="max-w-md">
                                <p className="font-medium text-foreground line-clamp-1 text-sm">{q.question}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{q.id}</p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="badge badge-default">{q.topic}</span>
                            </td>
                            <td className="table-cell">
                              <span className={`badge ${q.difficulty === "Basic" ? "badge-success" : q.difficulty === "Intermediate" ? "badge-warning" : "badge-danger"}`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isConfirmingDelete ? (
                                  <div className="flex items-center gap-1.5 animate-fade-in">
                                    <button onClick={handleDeleteConfirmed} className="px-2 py-1 bg-danger text-white rounded-md text-[11px] font-medium hover:bg-danger/90">
                                      Delete
                                    </button>
                                    <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-muted rounded-md text-[11px] font-medium hover:bg-card-hover">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button onClick={() => handleEdit(q)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
                                      Edit
                                    </button>
                                    <button onClick={() => handleDeleteClick(q.id)} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger-muted rounded-md">
                                      Delete
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
              </div>
            </div>
          );
        })}

        {visibleEntries.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl">
            <h2 className="text-xl font-bold">
              {search ? `No questions matching "${search}"` : "The question bank is empty"}
            </h2>
            <p className="text-muted-foreground max-w-sm mt-2">
              {search ? "Try searching for a different term." : "Start by adding your first question."}
            </p>
          </div>
        )}
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

      {isHardResetting && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">System Hard Reset</h2>
              <p className="text-sm text-muted-foreground mb-6">
                CRITICAL: This will PERMANENTLY delete ALL data. This action cannot be reversed.
              </p>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type "WIPE EVERYTHING" to confirm</label>
                <input
                  type="text"
                  value={hardResetInput}
                  onChange={(e) => setHardResetInput(e.target.value)}
                  className="input w-full h-12 border-danger/30"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => { setIsHardResetting(false); setHardResetInput(""); }} className="btn-secondary flex-1 h-11">
                  Cancel
                </button>
                <button onClick={handleHardReset} disabled={isHardResetting || hardResetInput !== "WIPE EVERYTHING"} className="btn-destructive flex-1 h-11">
                  {isHardResetting ? "Wiping..." : "WIPE DATABASE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message as string}
        type={confirmModal.type}
      />
    </div>
  );
}