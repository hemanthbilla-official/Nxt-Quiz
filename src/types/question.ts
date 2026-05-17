import type { ChallengeMode, TestCase, RunCodeResponse } from "@/lib/editorTypes";

export type { ChallengeMode, TestCase, RunCodeResponse };

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  topic: string;
  difficulty: string;
  question_type: string;
  questionType?: string;
  question: string;
  code_snippet?: string | null;
  codeSnippet?: string | null;
  options: Option[];
  correct_option_id: string;
  explanation: string;
  tags: string[];
  points: number;
  position?: number;
  starter_code?: string | null;
  starterCode?: string | null;
  function_name?: string | null;
  functionName?: string | null;
  challenge_mode?: ChallengeMode | null;
  challengeMode?: ChallengeMode | null;
  test_cases?: TestCase[] | null;
  testCases?: TestCase[] | null;
  language?: string | null;
  exam_questions?: ExamQuestionRelation[];
}

export interface ExamQuestionRelation {
  exams?: ExamSummary;
}

export interface ExamSummary {
  id: string;
  title: string;
  exam_code: string;
}

export interface AnswerState {
  selected_option_id: string | null;
  is_bookmarked: boolean;
  is_skipped: boolean;
  code_answer?: string;
  code_language?: string;
  last_run_results?: RunCodeResponse | null;
  test_pass_count?: number;
  test_fail_count?: number;
  savedAt?: number;
}

export interface ExistingAnswer {
  question_id: string;
  selected_option_id: string | null;
  is_bookmarked: boolean;
  is_skipped: boolean;
  code_answer?: string | null;
  last_run_results?: RunCodeResponse | null;
  test_pass_count?: number;
  test_fail_count?: number;
}

export interface ApiExamQuestion extends Omit<
  Question,
  | "questionType"
  | "codeSnippet"
  | "options"
  | "starterCode"
  | "functionName"
  | "challengeMode"
  | "testCases"
  | "language"
  | "question_type"
> {
  options: string | Question["options"];
  question_type?: string | null;
  code_snippet?: string | null;
  starter_code?: string | null;
  function_name?: string | null;
  challenge_mode?: ChallengeMode | null;
  test_cases?: TestCase[] | null;
  language?: string | null;
}

export interface ValidatedQuestion {
  id?: string;
  topic?: string;
  questionType?: string;
  question_type?: string;
  question: string;
  codeSnippet?: string | null;
  options?: { id: string; text: string }[];
  correctOptionId?: string | null;
  correct_option_id?: string | null;
  explanation?: string;
  points?: number;
  starterCode?: string;
  starter_code?: string;
  starterFiles?: unknown[];
  starter_files?: unknown[];
  challengeMode?: string;
  challenge_mode?: string;
  testCases?: unknown[];
  test_cases?: unknown[];
}

export interface ValidationError {
  index: number;
  errors: string[];
}