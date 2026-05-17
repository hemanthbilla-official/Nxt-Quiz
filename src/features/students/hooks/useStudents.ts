import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student } from "@/types";
import * as api from "../services/studentsApi";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "react-toastify";

interface UseStudentsResult {
  students: Student[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  updateStudent: (id: string, updates: { full_name?: string; student_college_id?: string }) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
}

export function useStudents(): UseStudentsResult {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.students,
    queryFn: () => api.fetchStudents(),
    staleTime: 30 * 1000, // 30 seconds cache
    gcTime: 5 * 60 * 1000, // 5 minute garbage collection
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { full_name?: string; student_college_id?: string } }) =>
      api.updateStudent(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.students });

      // Snapshot previous value
      const previousStudents = queryClient.getQueryData<Student[]>(queryKeys.students);

      // Optimistically update
      queryClient.setQueryData<Student[]>(
        queryKeys.students,
        (old) => old?.map((s) => (s.id === id ? { ...s, ...updates } : s)) ?? []
      );

      return { previousStudents };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousStudents) {
        queryClient.setQueryData(queryKeys.students, context.previousStudents);
      }
      toast.error("Failed to update student");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStudent(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.students });
      const previousStudents = queryClient.getQueryData<Student[]>(queryKeys.students);

      queryClient.setQueryData<Student[]>(
        queryKeys.students,
        (old) => old?.filter((s) => s.id !== id) ?? []
      );

      return { previousStudents };
    },
    onError: (err, id, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(queryKeys.students, context.previousStudents);
      }
      toast.error("Failed to delete student");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });

  const updateStudent = async (id: string, updates: { full_name?: string; student_college_id?: string }): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, updates });
      toast.success("Student updated");
      return true;
    } catch {
      return false;
    }
  };

  const deleteStudent = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Student deleted");
      return true;
    } catch {
      return false;
    }
  };

  return {
    students: data ?? [],
    loading: isLoading,
    error: isError ? (error as Error) : null,
    refresh: refetch,
    updateStudent,
    deleteStudent,
  };
}