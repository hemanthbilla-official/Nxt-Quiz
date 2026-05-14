"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  PlusCircle, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Database, 
  X 
} from "lucide-react";

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
  const [isDeletingSections, setIsDeletingSections] = useState(false);

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

  const handleDownloadTemplate = () => {
    const template = [
      {
        id: "q-1-theory",
        topic: "React Basics",
        difficulty: "Basic",
        questionType: "theory",
        question: "Which hook is used to manage side effects in React?",
        options: [
          { id: "A", text: "useState" },
          { id: "B", text: "useEffect" },
          { id: "C", text: "useContext" },
          { id: "D", text: "useReducer" },
        ],
        correctOptionId: "B",
        explanation: "useEffect is designed to handle side effects in functional components.",
        tags: ["react", "hooks"],
        points: 1
      },
      {
        id: "q-2-code-output",
        topic: "JavaScript Scopes",
        difficulty: "Intermediate",
        questionType: "code-output",
        question: "What is the output of the following code snippet?",
        codeSnippet: "let x = 1;\nif (true) {\n  let x = 2;\n}\nconsole.log(x);",
        options: [
          { id: "A", text: "1" },
          { id: "B", text: "2" },
          { id: "C", "text": "undefined" },
          { id: "D", "text": "ReferenceError" },
        ],
        correctOptionId: "A",
        explanation: "let is block-scoped, so the x inside the if block does not affect the outer x.",
        tags: ["javascript", "scope"],
        points: 2
      },
      {
        id: "q-3-prog-func",
        topic: "JavaScript Algorithms",
        difficulty: "Intermediate",
        questionType: "programming",
        question: "Write a function `sumArray` that returns the sum of all numbers in an array.",
        challengeMode: "function",
        language: "javascript",
        functionName: "sumArray",
        starterCode: "function sumArray(arr) {\n  // Your code here\n  return 0;\n}",
        testCases: [
          { inputs: [[1, 2, 3]], expected: 6 },
          { inputs: [[-1, 5, 2]], expected: 6 },
          { inputs: [[]], expected: 0 }
        ],
        tags: ["algorithms", "arrays"],
        points: 5
      },
      {
        id: "q-4-prog-react",
        topic: "React Components",
        difficulty: "Advanced",
        questionType: "programming",
        question: "Create a React component named `Greeting` that accepts a `name` prop and renders an `<h1>` containing 'Hello, {name}!'.",
        challengeMode: "component",
        language: "javascript",
        functionName: "Greeting",
        starterCode: "import React from 'react';\n\nexport default function Greeting({ name }) {\n  return (\n    <div>\n      {/* Your code here */}\n    </div>\n  );\n}",
        testCases: [
          { inputs: [{ name: "Alice" }], expected: "Hello, Alice!" },
          { inputs: [{ name: "Bob" }], expected: "Hello, Bob!" }
        ],
        tags: ["react", "components", "jsx"],
        points: 10
      }
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz_template_detailed.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSection = (sectionName: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const toggleSectionCheckbox = (sectionName: string) => {
    setSelectedSections((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const toggleAllSections = (allSections: string[]) => {
    const allSelected = allSections.every((s) => selectedSections[s]);
    const next: Record<string, boolean> = {};
    allSections.forEach((s) => (next[s] = !allSelected));
    setSelectedSections(next);
  };

  const downloadFile = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getQuestionFingerprint = (q: Question): string => {
    const questionText = q.question.trim().toLowerCase();
    const opts: Option[] = typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []);
    const optionTexts = opts
      .map((o) => o.text.trim().toLowerCase())
      .sort()
      .join("|");
    return `${questionText}::${optionTexts}`;
  };

  const handleDownloadQuestions = (grouped: Record<string, Question[]>) => {
    const checkedKeys = Object.keys(selectedSections).filter((k) => selectedSections[k]);
    const sectionsToExport = checkedKeys.length > 0 ? checkedKeys : Object.keys(grouped);

    const seen = new Set<string>();
    const deduped: Question[] = [];
    sectionsToExport.forEach((section) => {
      (grouped[section] || []).forEach((q) => {
        const fingerprint = getQuestionFingerprint(q);
        if (!seen.has(fingerprint)) {
          seen.add(fingerprint);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { exam_questions: _exam_questions, ...clean } = q;
          deduped.push(clean as Question);
        }
      });
    });

    const filename = checkedKeys.length > 0
      ? `questions_selected_${checkedKeys.length}_sections.json`
      : "questions_all.json";
    downloadFile(deduped, filename);
  };

  const fetchQuestionsOld = useCallback(async () => {
    const res = await fetch("/api/admin/questions");
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestionsOld();
  }, [fetchQuestionsOld]);

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
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove the question from all exams."))
      return;
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (res.ok) fetchQuestions();
  };

  const handleHardReset = async () => {
    const confirmText = prompt(
      'CRITICAL: This will PERMANENTLY delete ALL exams, ALL student attempts, and ALL questions from the entire database. Type "WIPE EVERYTHING" to confirm:',
    );
    if (confirmText !== "WIPE EVERYTHING") return;

    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/admin/hard-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "WIPE DATABASE" }),
      });
      if (res.ok) {
        alert("Database has been completely wiped clean.");
        fetchQuestions();
      } else {
        alert("Wipe failed.");
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllQuestionsInSection = (examName: string, qs: Question[]) => {
    const sectionQs = qs.map(q => q.id);
    const allSelected = sectionQs.every(id => selectedQuestions[id]);
    const next = { ...selectedQuestions };
    sectionQs.forEach(id => next[id] = !allSelected);
    setSelectedQuestions(next);
  };

  const selectedCount = Object.values(selectedQuestions).filter(Boolean).length;

  const handleBulkDelete = async () => {
    const ids = Object.keys(selectedQuestions).filter(id => selectedQuestions[id]);
    if (ids.length === 0) return;
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/questions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: ids }),
      });
      if (res.ok) {
        showToast(`Successfully deleted ${ids.length} questions`);
        setSelectedQuestions({});
        await fetchQuestions();
      } else {
        showToast("Failed to delete questions", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteConfirmed = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Question deleted");
        await fetchQuestions();
      } else {
        showToast("Delete failed", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setSubmitting(false);
      setDeleteConfirmId(null);
    }
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
      showToast("Failed to load questions", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

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
    <div className="space-y-6 pb-20 relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-2 rounded-md shadow-lg border animate-fade-in ${
          toast.type === "success" ? "bg-success/10 border-success text-success" : "bg-danger/10 border-danger text-danger"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Floating Bulk Actions */}
      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
          <div className="bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-border/10">
            <span className="text-sm font-bold">{selectedCount} questions selected</span>
            <div className="h-4 w-px bg-background/20" />
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBulkDelete}
                disabled={submitting}
                className="text-sm font-bold text-danger hover:text-danger/80 disabled:opacity-50"
              >
                Delete Selected
              </button>
              <button 
                onClick={() => setSelectedQuestions({})}
                className="text-sm font-bold hover:opacity-80"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-sm text-muted-foreground">Manage assessment content across all exams</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-md text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
            />
          </div>
          
          <select
            value={selectedExamName}
            onChange={(e) => setSelectedExamName(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-md text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"
          >
            <option value="All">All Exams</option>
            {availableExams.map(exam => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>

          <button
            onClick={() => { setEditingId(null); setShowAdd(true); }}
            className="btn-primary h-10 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Question</span>
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
                className="p-4 bg-card-hover/50 flex items-center gap-4 cursor-pointer select-none"
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
                <div className={`transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
                <h2 className="flex-1 font-bold text-sm">{examName}</h2>
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {qs.length} Questions
                </span>
              </div>
              
              {isOpen && (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar sticky-table">
                  <table className="w-full text-sm">
                    <thead className="bg-card border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="p-4 w-10"></th>
                        <th className="p-4 text-left font-medium text-muted-foreground">Question</th>
                        <th className="p-4 text-left font-medium text-muted-foreground">Topic</th>
                        <th className="p-4 text-left font-medium text-muted-foreground">Difficulty</th>
                        <th className="p-4 text-right font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qs.map((q) => {
                        const isSelected = !!selectedQuestions[q.id];
                        const isConfirmingDelete = deleteConfirmId === q.id;
                        return (
                          <tr 
                            key={q.id} 
                            className={`border-b border-border/50 hover:bg-card-hover transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                          >
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuestionSelection(q.id)}
                                className="w-4 h-4 rounded border-border"
                              />
                            </td>
                            <td className="p-4">
                              <div className="max-w-md">
                                <p className="font-medium text-foreground line-clamp-1">{q.question}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase tracking-tighter opacity-60">
                                  {q.id}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-xs px-2 py-0.5 bg-muted rounded border border-border text-muted-foreground">
                                {q.topic}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                q.difficulty === "Basic" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isConfirmingDelete ? (
                                  <div className="flex items-center gap-1.5 animate-fade-in">
                                    <button 
                                      onClick={() => handleDeleteConfirmed(q.id)}
                                      className="text-[10px] font-bold text-danger hover:underline"
                                    >
                                      Confirm
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="text-[10px] font-bold text-muted-foreground hover:underline"
                                    >
                                      No
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
                                      className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" 
            onClick={() => setShowAdd(false)}
          />
          <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Question" : "Add Question"}
              </h2>
              <button onClick={() => setShowAdd(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Topic</label>
                  <input
                    required
                    type="text"
                    value={form.topic}
                    onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full h-11 px-4 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full h-11 px-4 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Question Type</label>
                <div className="flex gap-4">
                  {["theory", "code-output", "programming"].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, question_type: type }))}
                      className={`px-4 py-2 rounded-md border text-xs font-bold uppercase tracking-wider transition-all ${
                        form.question_type === type 
                          ? "bg-primary/10 border-primary text-primary" 
                          : "border-border text-muted-foreground hover:border-muted"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Question Body</label>
                <textarea
                  required
                  rows={4}
                  value={form.question}
                  onChange={e => setForm(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full p-4 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  placeholder="Enter the question text..."
                />
              </div>

              {(form.question_type === "code-output" || form.question_type === "programming") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Code Snippet</label>
                  <textarea
                    rows={6}
                    value={form.code_snippet || ""}
                    onChange={e => setForm(prev => ({ ...prev, code_snippet: e.target.value }))}
                    className="w-full p-4 bg-muted/50 border border-border rounded-md font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    placeholder="// Enter code here..."
                  />
                </div>
              )}

              {form.question_type !== "programming" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-muted-foreground">Options</label>
                  <div className="grid grid-cols-1 gap-3">
                    {(form.options || []).map((opt, idx) => (
                      <div key={opt.id} className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, correct_option_id: opt.id }))}
                          className={`w-11 h-11 rounded-md border font-bold transition-all ${
                            form.correct_option_id === opt.id 
                              ? "bg-success text-white border-success" 
                              : "border-border text-muted-foreground hover:border-muted"
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
                          className="flex-1 h-11 px-4 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder={`Option ${opt.id} text...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Explanation</label>
                <textarea
                  rows={3}
                  value={form.explanation}
                  onChange={e => setForm(prev => ({ ...prev, explanation: e.target.value }))}
                  className="w-full p-4 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  placeholder="Explain the correct answer..."
                />
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="btn-secondary flex-1 h-12"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 h-12 flex items-center justify-center gap-2"
                >
                  {submitting && <div className="spinner h-4 w-4 border-white border-t-transparent" />}
                  {editingId ? "Update Question" : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
