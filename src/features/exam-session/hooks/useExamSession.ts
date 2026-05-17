import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Question, AnswerState, ApiExamQuestion, ExistingAnswer, ChallengeMode } from "@/types";
import type { ExamControls } from "@/lib/exam-controls";
import { shuffleArray } from "@/lib/utils/random";
import { loadExamInit } from "../services/examApi";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "react-toastify";

interface UseExamSessionResult {
  questions: Question[];
  answers: Record<string, AnswerState>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, AnswerState>>>;
  attemptId: string | null;
  controls: ExamControls;
  loading: boolean;
  error: string | null;
  serverDrift: number;
  initialTimeLeft: number | null;
  refresh: () => void;
  saveAnswer: (questionId: string, answer: Partial<AnswerState>) => Promise<boolean>;
}

export function useExamSession(examId: string): UseExamSessionResult {
  const queryClient = useQueryClient();
  
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.examInit(examId),
    queryFn: () => loadExamInit(examId),
    staleTime: Infinity, // Exam session data shouldn't be refetched automatically
    gcTime: 30 * 60 * 1000, // Keep for 30 minutes
    retry: false, // Don't retry on exam load failure
  });

  // Save answer mutation with optimistic updates
  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: Partial<AnswerState> }) => {
      const response = await fetch(`/api/exam/${examId}/answer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          ...answer,
        }),
      });
      if (!response.ok) throw new Error("Failed to save answer");
      return response.json();
    },
    onMutate: async ({ questionId, answer }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.examInit(examId) });
      
      const previousAnswers = queryClient.getQueryData(queryKeys.examInit(examId));
      
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          ...answer,
        },
      }));
      
      return { previousAnswers };
    },
    onError: (err, variables, context) => {
      // Rollback would require refetching
      console.error("Failed to save answer:", err);
      toast.error("Failed to save answer");
    },
  });

  const saveAnswer = useCallback(async (questionId: string, answer: Partial<AnswerState>): Promise<boolean> => {
    try {
      await saveAnswerMutation.mutateAsync({ questionId, answer });
      return true;
    } catch {
      return false;
    }
  }, [saveAnswerMutation]);

  // Extract and process data
  const attemptId = data?.attempt?.id ?? null;
  
  // Compute drift using useMemo to avoid calling Date.now() during render
  const serverDrift = useMemo(() => {
    if (!data?.serverNow) return 0;
    return data.serverNow - Date.now();
  }, [data?.serverNow]);
  
  const initialTimeLeft = useMemo(() => {
    if (!data?.attempt?.server_due_at || !data?.serverNow) return null;
    const dueAtMs = new Date(data.attempt.server_due_at).getTime();
    return Math.max(0, Math.floor((dueAtMs - data.serverNow) / 1000));
  }, [data?.attempt?.server_due_at, data?.serverNow]);

  const controls: ExamControls = data?.controls ?? {
    proctoringEnabled: true,
    tabSwitchWarningEnabled: true,
    fullscreenRequired: true,
    copyPasteBlocked: true,
    rightClickBlocked: true,
    questionNavigatorEnabled: true,
    bookmarksEnabled: true,
    skipEnabled: true,
    clearAnswerEnabled: true,
    themeToggleEnabled: true,
    codeRunTestsEnabled: true,
    codeFormatEnabled: true,
    codeConsoleEnabled: true,
    codeFileActionsEnabled: true,
    codeZoomEnabled: true,
  };

  // Process questions
  const questions: Question[] = useMemo(() => {
    return (data?.questions ?? []).map(
      (eq: ApiExamQuestion): Question => ({
        ...eq,
        options: typeof eq.options === "string" ? JSON.parse(eq.options) : eq.options || [],
        question_type: eq.question_type || "theory",
        questionType: eq.question_type || "theory",
        codeSnippet: eq.code_snippet || undefined,
        starterCode: eq.starter_code || undefined,
        functionName: eq.function_name || undefined,
        challengeMode: (eq.challenge_mode as ChallengeMode) || undefined,
        testCases: eq.test_cases || undefined,
        language: eq.language || undefined,
      })
    );
  }, [data?.questions]);

  // Shuffle questions based on attempt ID
  const shuffledQuestions = useMemo(() => {
    return questions.length > 0 && attemptId 
      ? shuffleArray(questions, attemptId) 
      : questions;
  }, [questions, attemptId]);

  // Initialize answers from server data (merge, don't overwrite local state)
  useEffect(() => {
    if (data?.answers) {
      setAnswers((prev) => {
        const merged = { ...prev };
        (data.answers as ExistingAnswer[]).forEach((a: ExistingAnswer) => {
          merged[a.question_id] = {
            selected_option_id: a.selected_option_id,
            is_bookmarked: a.is_bookmarked,
            is_skipped: a.is_skipped,
            code_answer: a.code_answer || undefined,
            last_run_results: a.last_run_results || undefined,
            test_pass_count: a.test_pass_count || 0,
            test_fail_count: a.test_fail_count || 0,
          };
        });
        return merged;
      });
    }
  }, [data?.answers]);

  // Handle redirect if already submitted
  useEffect(() => {
    if (data?.attempt?.status === "submitted") {
      window.location.href = `/exam/${examId}/submitted`;
    }
  }, [data?.attempt?.status, examId]);

  return {
    questions: shuffledQuestions,
    answers,
    setAnswers,
    attemptId,
    controls,
    loading: isLoading,
    error: isError ? (error as Error)?.message ?? "Failed to load exam" : null,
    serverDrift,
    initialTimeLeft,
    refresh: refetch,
    saveAnswer,
  };
}