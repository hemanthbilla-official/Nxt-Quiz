import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Question } from "@/types";
import * as api from "../services/questionsApi";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "react-toastify";

interface UseQuestionBankResult {
  questions: Question[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  createQuestion: (question: Partial<Question>) => Promise<boolean>;
  updateQuestion: (id: string, question: Partial<Question>) => Promise<boolean>;
  deleteQuestion: (id: string) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
  hardReset: () => Promise<boolean>;
}

export function useQuestionBank(): UseQuestionBankResult {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.questions,
    queryFn: () => api.fetchQuestions(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (question: Partial<Question>) => api.createQuestion(question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      toast.success("Question created");
    },
    onError: () => {
      toast.error("Failed to create question");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, question }: { id: string; question: Partial<Question> }) =>
      api.updateQuestion(id, question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      toast.success("Question updated");
    },
    onError: () => {
      toast.error("Failed to update question");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      toast.success("Question deleted");
    },
    onError: () => {
      toast.error("Failed to delete question");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteQuestions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      toast.success("Questions deleted");
    },
    onError: () => {
      toast.error("Failed to delete questions");
    },
  });

  const hardResetMutation = useMutation({
    mutationFn: () => api.hardResetDatabase(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      toast.success("Database wiped successfully");
    },
    onError: () => {
      toast.error("Wipe failed");
    },
  });

  const createQuestion = async (question: Partial<Question>): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(question);
      return true;
    } catch {
      return false;
    }
  };

  const updateQuestion = async (id: string, question: Partial<Question>): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, question });
      return true;
    } catch {
      return false;
    }
  };

  const deleteQuestion = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const bulkDelete = async (ids: string[]): Promise<boolean> => {
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      return true;
    } catch {
      return false;
    }
  };

  const hardReset = async (): Promise<boolean> => {
    try {
      await hardResetMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  };

  return {
    questions: data ?? [],
    loading: isLoading,
    error: isError ? (error as Error) : null,
    refresh: refetch,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkDelete,
    hardReset,
  };
}