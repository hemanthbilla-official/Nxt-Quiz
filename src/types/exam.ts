import type { ExamControls } from "@/lib/exam-controls";
import type { ValidatedQuestion, ApiExamQuestion, ExistingAnswer } from "./question";

export interface Exam {
  id: string;
  title: string;
  exam_code: string;
  duration_minutes: number;
  capacity: number;
  status: "draft" | "open" | "closed" | "ended";
  created_at: string;
  starts_at?: string;
  closes_at?: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  status: "in_progress" | "submitted" | "kicked";
  started_at: string;
  server_due_at: string;
  submitted_at?: string;
}

export interface ExamInitResponse {
  attempt: ExamAttempt;
  questions: ApiExamQuestion[];
  answers: ExistingAnswer[];
  serverNow: number;
  controls: ExamControls;
}

export interface ExamStatusResponse {
  status: "open" | "closed" | "ended";
  attempt?: ExamAttempt;
}

export interface CreateExamRequest {
  title: string;
  durationMinutes: number;
  capacity: number;
}

export interface CreateExamResponse {
  examId: string;
  examCode: string;
}

export interface ImportQuestionsRequest {
  questions: ValidatedQuestion[];
  examId: string;
}

export { DEFAULT_EXAM_CONTROLS } from "@/lib/exam-controls";
export type { ExamControls } from "@/lib/exam-controls";