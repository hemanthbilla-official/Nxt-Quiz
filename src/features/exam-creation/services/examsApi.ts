import type { CreateExamRequest, CreateExamResponse, ValidatedQuestion } from "@/types";

export async function createExam(data: CreateExamRequest): Promise<CreateExamResponse> {
  const res = await fetch("/api/admin/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create exam");
  }
  return res.json();
}

export async function importQuestions(examId: string, questions: ValidatedQuestion[]): Promise<void> {
  const res = await fetch("/api/admin/questions/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, examId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to import questions");
  }
}