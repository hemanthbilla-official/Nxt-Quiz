import { useCallback } from "react";
import type { AnswerState } from "@/types";

type AnswersMap = Record<string, AnswerState>;

interface UseAnswerStateOptions {
  answers: AnswersMap;
  setAnswers: React.Dispatch<React.SetStateAction<AnswersMap>>;
  saveAnswer: (questionId: string, state: AnswerState) => void;
  examId: string;
  attemptId: string | null;
}

interface UseAnswerStateResult {
  selectOption: (questionId: string, optionId: string) => void;
  clearAnswer: (questionId: string) => void;
  toggleBookmark: (questionId: string) => void;
  skipQuestion: (questionId: string, hasNext: boolean, goToNext: () => void, goToReview: () => void) => void;
  saveCodeAnswer: (questionId: string, code: string) => void;
  getAnsweredCount: () => number;
}

export function useAnswerState({
  answers,
  setAnswers,
  saveAnswer,
  examId,
  attemptId,
}: UseAnswerStateOptions): UseAnswerStateResult {
  const selectOption = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => {
        const current = prev[questionId] || {
          selected_option_id: null,
          is_bookmarked: false,
          is_skipped: false,
        };
        const newState: AnswerState = {
          ...current,
          selected_option_id: optionId,
          is_skipped: false,
        };
        saveAnswer(questionId, newState);
        return { ...prev, [questionId]: newState };
      });
    },
    [setAnswers, saveAnswer]
  );

  const clearAnswer = useCallback(
    (questionId: string) => {
      setAnswers((prev) => {
        const current = prev[questionId] || {
          selected_option_id: null,
          is_bookmarked: false,
          is_skipped: false,
        };
        const newState: AnswerState = { ...current, selected_option_id: null };
        saveAnswer(questionId, newState);
        return { ...prev, [questionId]: newState };
      });
    },
    [setAnswers, saveAnswer]
  );

  const toggleBookmark = useCallback(
    (questionId: string) => {
      setAnswers((prev) => {
        const current = prev[questionId] || {
          selected_option_id: null,
          is_bookmarked: false,
          is_skipped: false,
        };
        const newState: AnswerState = {
          ...current,
          is_bookmarked: !current.is_bookmarked,
        };
        saveAnswer(questionId, newState);
        return { ...prev, [questionId]: newState };
      });
    },
    [setAnswers, saveAnswer]
  );

  const skipQuestion = useCallback(
    (questionId: string, hasNext: boolean, goToNext: () => void, goToReview: () => void) => {
      setAnswers((prev) => {
        const current = prev[questionId] || {
          selected_option_id: null,
          is_bookmarked: false,
          is_skipped: false,
        };
        if (!current.selected_option_id) {
          const newState: AnswerState = { ...current, is_skipped: true };
          saveAnswer(questionId, newState);
          return { ...prev, [questionId]: newState };
        }
        return prev;
      });
      if (hasNext) {
        goToNext();
      } else {
        goToReview();
      }
    },
    [setAnswers, saveAnswer]
  );

  const saveCodeAnswer = useCallback(
    (questionId: string, code: string) => {
      if (!attemptId) return;
      setAnswers((prev) => {
        const current = prev[questionId] || {
          selected_option_id: null,
          is_bookmarked: false,
          is_skipped: false,
        };
        const newState: AnswerState = { ...current, code_answer: code };
        saveAnswer(questionId, newState);
        return { ...prev, [questionId]: newState };
      });
    },
    [attemptId, setAnswers, saveAnswer]
  );

  const getAnsweredCount = useCallback(
    () => Object.values(answers).filter((a) => a.selected_option_id || a.code_answer?.trim()).length,
    [answers]
  );

  return {
    selectOption,
    clearAnswer,
    toggleBookmark,
    skipQuestion,
    saveCodeAnswer,
    getAnsweredCount,
  };
}
