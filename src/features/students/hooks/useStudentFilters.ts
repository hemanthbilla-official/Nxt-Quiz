import { useState, useMemo } from "react";
import type { Student } from "@/types";

type SortKey = keyof Student;
type SortDirection = "asc" | "desc";

interface UseStudentFiltersResult {
  search: string;
  setSearch: (search: string) => void;
  statusFilter: "all" | "onboarded" | "pending";
  setStatusFilter: (status: "all" | "onboarded" | "pending") => void;
  sortConfig: { key: SortKey; direction: SortDirection } | null;
  setSortConfig: (config: { key: SortKey; direction: SortDirection } | null) => void;
  filteredStudents: Student[];
}

export function useStudentFilters(students: Student[]): UseStudentFiltersResult {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "onboarded" | "pending">("all");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: "full_name", direction: "asc" });

  const updateSortConfig = (config: { key: SortKey; direction: SortDirection } | null) => {
    setSortConfig(config);
  };

  const filteredStudents = useMemo(() => {
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

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortConfig,
    setSortConfig: updateSortConfig,
    filteredStudents,
  };
}