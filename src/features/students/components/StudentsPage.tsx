"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { Search, X, Edit2, Trash2, Users, Check } from "lucide-react";
import type { Student } from "@/types";
import { useStudents, useStudentFilters } from "../hooks";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";

export function StudentsPage() {
  const { students, loading, refresh, updateStudent, deleteStudent } = useStudents();
  const { search, setSearch, statusFilter, setStatusFilter, sortConfig, setSortConfig, filteredStudents } = useStudentFilters(students);

  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", student_college_id: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (key: keyof Student) => {
    const current = sortConfig;
    if (current?.key === key) {
      setSortConfig({ key, direction: current.direction === "asc" ? "desc" : "asc" });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  const handleSaveInlineEdit = async (studentId: string) => {
    setIsSaving(true);
    const success = await updateStudent(studentId, editForm);
    if (success) {
      showToast("Student updated");
      setInlineEditingId(null);
    } else {
      showToast("Failed to update", "error");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const success = await deleteStudent(deleteConfirmId);
    if (success) {
      showToast("Student deleted");
    } else {
      showToast("Failed to delete", "error");
    }
    setDeleteConfirmId(null);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (inlineEditingId) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedRowIndex(prev => Math.min(prev + 1, filteredStudents.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedRowIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedRowIndex !== -1) {
      const student = filteredStudents[selectedRowIndex];
      setInlineEditingId(student.id);
      setEditForm({ full_name: student.full_name || "", student_college_id: student.student_college_id || "" });
    }
  }, [filteredStudents, inlineEditingId, selectedRowIndex]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border">
          <div>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-56 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
        <div className="card overflow-hidden">
          <SkeletonTable rows={8} />
        </div>
      </div>
    );
  }

  const activeFiltersCount = (search ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage registered students</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full"
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "onboarded" | "pending")}
            className="input w-auto"
          >
            <option value="all">All Status</option>
            <option value="onboarded">Onboarded</option>
            <option value="pending">Pending</option>
          </select>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-xs font-medium text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-muted border border-accent/20 rounded-md text-xs font-medium text-accent">
              <span>Search: {search}</span>
              <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button>
            </div>
          )}
          {statusFilter !== "all" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-muted border border-accent/20 rounded-md text-xs font-medium text-accent">
              <span>Status: {statusFilter}</span>
              <button onClick={() => setStatusFilter("all")}><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="table-header-cell cursor-pointer" onClick={() => handleSort("full_name")}>
                  <div className="flex items-center gap-1">
                    Name
                    <span className="opacity-30">
                      {sortConfig?.key === "full_name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="table-header-cell cursor-pointer" onClick={() => handleSort("student_college_id")}>
                  <div className="flex items-center gap-1">
                    College ID
                    <span className="opacity-30">
                      {sortConfig?.key === "student_college_id" ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </div>
                </th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => {
                const isEditing = inlineEditingId === s.id;
                const isSelected = selectedRowIndex === idx;
                const isConfirmingDelete = deleteConfirmId === s.id;

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-border transition-colors ${isSelected ? "bg-accent/5 ring-1 ring-inset ring-accent/15" : "hover:bg-card-hover"}`}
                    onClick={() => setSelectedRowIndex(idx)}
                  >
                    <td className="table-cell">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="text"
                          value={editForm.full_name}
                          onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="input w-full h-8 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-foreground">{s.full_name || "—"}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.student_college_id}
                          onChange={e => setEditForm(prev => ({ ...prev, student_college_id: e.target.value.toUpperCase() }))}
                          className="input w-full h-8 text-sm font-mono"
                        />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">{s.student_college_id || "—"}</span>
                      )}
                    </td>
                    <td className="table-cell text-muted-foreground">{s.email}</td>
                    <td className="table-cell">
                      <span className={`badge ${s.onboarded_at ? "badge-success" : "badge-warning"}`}>
                        {s.onboarded_at ? "Onboarded" : "Pending"}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveInlineEdit(s.id)} disabled={isSaving} className="p-1.5 text-success hover:bg-success-muted rounded-md">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setInlineEditingId(null)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 animate-fade-in">
                            <button onClick={handleDelete} className="px-2 py-1 bg-danger text-white rounded-md text-[11px] font-medium hover:bg-danger/90">
                              Delete
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-muted rounded-md text-[11px] font-medium hover:bg-card-hover">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setInlineEditingId(s.id);
                                setEditForm({ full_name: s.full_name || "", student_college_id: s.student_college_id || "" });
                              }}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(s.id)} className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger-muted rounded-md">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold">
                        {search ? `No results for "${search}"` : "No students found"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search ? "Try adjusting your search." : "Students appear here once they register."}
                      </p>
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