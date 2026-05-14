"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, X, Edit2, Trash2, Users } from "lucide-react";

interface ParticipantInfo {
  status: string;
  exams: {
    title: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  student_college_id: string;
  role: string;
  onboarded_at: string | null;
  created_at: string;
  exam_participants?: ParticipantInfo[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "onboarded" | "pending">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", student_college_id: "" });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: "asc" | "desc" } | null>({ key: "full_name", direction: "asc" });
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (key: keyof Student) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      showToast("Failed to load students", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    try {
      const res = await fetch("/api/admin/students", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== userId));
        showToast("Student deleted successfully");
      } else {
        showToast("Failed to delete student", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleSaveInlineEdit = async (studentId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: studentId,
          full_name: editForm.full_name,
          student_college_id: editForm.student_college_id,
        }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? { ...s, full_name: editForm.full_name, student_college_id: editForm.student_college_id }
              : s
          )
        );
        setInlineEditingId(null);
        showToast("Student updated");
      } else {
        showToast("Failed to update student", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => {
    let result = students.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.student_college_id || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === "onboarded") return !!s.onboarded_at;
      if (statusFilter === "pending") return !s.onboarded_at;
      return true;
    });

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [students, search, statusFilter, sortConfig]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inlineEditingId) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedRowIndex(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedRowIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && selectedRowIndex !== -1) {
        const student = filtered[selectedRowIndex];
        setInlineEditingId(student.id);
        setEditForm({ full_name: student.full_name || "", student_college_id: student.student_college_id || "" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, inlineEditingId, selectedRowIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner h-8 w-8" />
      </div>
    );
  }

  const activeFiltersCount = (search ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-2 rounded-md shadow-lg border animate-fade-in ${
          toast.type === "success" ? "bg-success/10 border-success text-success" : "bg-danger/10 border-danger text-danger"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor registered students</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Filter students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-md text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "onboarded" | "pending")}
            className="h-10 px-3 bg-card border border-border rounded-md text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            <option value="onboarded">Onboarded</option>
            <option value="pending">Pending</option>
          </select>

          {activeFiltersCount > 0 && (
            <button 
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-full text-xs font-medium text-primary">
              <span>Search: {search}</span>
              <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button>
            </div>
          )}
          {statusFilter !== "all" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-full text-xs font-medium text-primary">
              <span>Status: {statusFilter}</span>
              <button onClick={() => setStatusFilter("all")}><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card-hover/50 sticky top-0 z-10">
                <th 
                  className="p-4 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort("full_name")}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {sortConfig?.key === "full_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </div>
                </th>
                <th 
                  className="p-4 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort("student_college_id")}
                >
                  <div className="flex items-center gap-1">
                    College ID
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {sortConfig?.key === "student_college_id" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="p-4 text-left font-medium text-muted-foreground">Email</th>
                <th className="p-4 text-left font-medium text-muted-foreground">Status</th>
                <th className="p-4 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => {
                const isEditing = inlineEditingId === s.id;
                const isSelected = selectedRowIndex === idx;
                const isConfirmingDelete = deleteConfirmId === s.id;

                return (
                  <tr 
                    key={s.id} 
                    className={`border-b border-border/50 transition-colors ${
                      isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-card-hover"
                    }`}
                    onClick={() => setSelectedRowIndex(idx)}
                  >
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editForm.full_name}
                          onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full h-8 px-2 bg-background border border-primary rounded text-sm outline-none"
                        />
                      ) : (
                        <span className="font-medium text-foreground">{s.full_name || "—"}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.student_college_id}
                          onChange={e => setEditForm(prev => ({ ...prev, student_college_id: e.target.value.toUpperCase() }))}
                          className="w-full h-8 px-2 bg-background border border-primary rounded text-sm outline-none font-mono"
                        />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">{s.student_college_id || "—"}</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{s.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.onboarded_at ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20"
                      }`}>
                        {s.onboarded_at ? "Onboarded" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveInlineEdit(s.id)}
                              disabled={isSaving}
                              className="text-xs font-bold text-success hover:underline disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setInlineEditingId(null)}
                              className="text-xs font-bold text-muted-foreground hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        ) : isConfirmingDelete ? (
                          <div className="flex items-center gap-2 animate-fade-in">
                            <span className="text-[10px] font-bold text-danger uppercase">Confirm?</span>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="px-2 py-1 bg-danger text-white rounded text-[10px] font-bold"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-muted rounded text-[10px] font-bold"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setInlineEditingId(s.id);
                                setEditForm({ full_name: s.full_name || "", student_college_id: s.student_college_id || "" });
                              }}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                              aria-label="Edit student"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(s.id)}
                              className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                              aria-label="Delete student"
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-bold">
                        {search ? `No results for "${search}"` : "No students found"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search ? "Try adjusting your search terms or filters." : "Students will appear here once they register."}
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={() => { setSearch(""); setStatusFilter("all"); }}
                          className="mt-4 text-xs font-bold text-primary hover:underline"
                        >
                          Reset all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
