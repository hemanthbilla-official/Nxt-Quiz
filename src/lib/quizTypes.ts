import type { ChallengeMode, TestCase, RunCodeResponse } from "./editorTypes";

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
  questionType?: string; // used in take/page.tsx sometimes
  question: string;
  code_snippet?: string | null;
  codeSnippet?: string | null;
  options: Option[];
  correct_option_id: string;
  explanation: string;
  tags: string[];
  points: number;
  position?: number; // used in take/page.tsx
  // Programming fields
  starter_code?: string | null;
  starterCode?: string | null;
  function_name?: string | null;
  functionName?: string | null;
  challenge_mode?: ChallengeMode | null;
  challengeMode?: ChallengeMode | null;
  test_cases?: TestCase[] | null;
  testCases?: TestCase[] | null;
  language?: string | null;
  exam_questions?: {
    exams?: { id: string; title: string; exam_code: string };
  }[];
}

export interface AnswerState {
  selected_option_id: string | null;
  is_bookmarked: boolean;
  is_skipped: boolean;
  code_answer?: string;
  last_run_results?: RunCodeResponse | null;
  test_pass_count?: number;
  test_fail_count?: number;
}

export interface ApiExamQuestion extends Omit<
  Question,
  "questionType" | "codeSnippet" | "options" | "starterCode" | "functionName" | "challengeMode" | "testCases" | "language" | "question_type"
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
