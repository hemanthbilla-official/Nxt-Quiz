import type { Question } from "@/types";

export interface QuestionsResponse {
  questions: Question[];
}

export async function fetchQuestions(): Promise<Question[]> {
  const res = await fetch("/api/admin/questions");
  if (res.ok) {
    const data = await res.json();
    return data.questions || [];
  }
  throw new Error("Failed to fetch questions");
}

export async function createQuestion(question: Partial<Question>): Promise<void> {
  const res = await fetch("/api/admin/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(question),
  });
  if (!res.ok) throw new Error("Failed to create question");
}

export async function updateQuestion(id: string, question: Partial<Question>): Promise<void> {
  const res = await fetch(`/api/admin/questions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(question),
  });
  if (!res.ok) throw new Error("Failed to update question");
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete question");
}

export async function bulkDeleteQuestions(ids: string[]): Promise<void> {
  const res = await fetch("/api/admin/questions/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionIds: ids }),
  });
  if (!res.ok) throw new Error("Failed to delete questions");
}

export async function hardResetDatabase(): Promise<void> {
  const res = await fetch("/api/admin/hard-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "WIPE DATABASE" }),
  });
  if (!res.ok) throw new Error("Failed to reset database");
}