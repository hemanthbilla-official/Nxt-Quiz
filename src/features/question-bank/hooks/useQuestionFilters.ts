import { useState, useMemo, useCallback } from "react";
import type { Question } from "@/types";

interface GroupedQuestions {
  [examLabel: string]: Question[];
}

interface UseQuestionFiltersResult {
  search: string;
  setSearch: (search: string) => void;
  selectedExam: string;
  setSelectedExam: (exam: string) => void;
  filtered: Question[];
  groupedQuestions: GroupedQuestions;
  availableExams: string[];
}

export function useQuestionFilters(questions: Question[]): UseQuestionFiltersResult {
  const [search, setSearch] = useState("");
  const [selectedExam, setSelectedExam] = useState("All");

  const filtered = useMemo(() => {
    return questions.filter(
      (q) =>
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.topic.toLowerCase().includes(search.toLowerCase())
    );
  }, [questions, search]);

  const groupedQuestions = useMemo(() => {
    return filtered.reduce((acc, q) => {
      if (!q.exam_questions || q.exam_questions.length === 0) {
        const label = "Unassigned / Global Pool";
        if (!acc[label]) acc[label] = [];
        acc[label].push(q);
      } else {
        q.exam_questions.forEach((eq) => {
          const parentExam = eq.exams;
          const label = parentExam
            ? `${parentExam.title} (${parentExam.exam_code})`
            : "Unassigned / Global Pool";
          if (!acc[label]) acc[label] = [];
          if (!acc[label].find((existing) => existing.id === q.id)) {
            acc[label].push(q);
          }
        });
      }
      return acc;
    }, {} as GroupedQuestions);
  }, [filtered]);

  const availableExams = useMemo(() => {
    return Object.keys(groupedQuestions).sort();
  }, [groupedQuestions]);

  return {
    search,
    setSearch,
    selectedExam,
    setSelectedExam,
    filtered,
    groupedQuestions,
    availableExams,
  };
}