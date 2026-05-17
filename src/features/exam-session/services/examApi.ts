import type { AnswerState, ExistingAnswer, ApiExamQuestion } from "@/types";
import type { ExamControls } from "@/lib/exam-controls";

export interface ExamInitData {
  attempt: {
    id: string;
    status: string;
    server_due_at: string;
  };
  questions: ApiExamQuestion[];
  answers: ExistingAnswer[];
  serverNow: number;
  controls: ExamControls;
}

export async function loadExamInit(examId: string): Promise<ExamInitData> {
  const res = await fetch(`/api/exam/${examId}/take-init`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load exam");
  }
  return res.json();
}

export async function saveAnswer(
  examId: string,
  attemptId: string,
  questionId: string,
  state: AnswerState
): Promise<void> {
  await fetch(`/api/exam/${examId}/answer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, questionId, ...state }),
  });
}

export async function saveBulkAnswers(
  examId: string,
  attemptId: string,
  answers: Record<string, AnswerState>
): Promise<void> {
  await fetch(`/api/exam/${examId}/answer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, answers }),
  });
}

export async function submitExam(examId: string, attemptId: string): Promise<void> {
  await fetch(`/api/exam/${examId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId }),
  });
}

export async function checkExamStatus(examId: string): Promise<{
  status: string;
  attempt?: { id: string; status: string };
}> {
  const res = await fetch(`/api/exam/${examId}/status`);
  if (!res.ok) {
    throw new Error("Failed to check status");
  }
  return res.json();
}

export async function reportProctoringEvent(examId: string): Promise<void> {
  await fetch(`/api/exam/${examId}/proctor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}