// ==========================================================================
// Editor types — shared between code-editor components and quiz logic
// ==========================================================================

// --- Code editor core types (from code-editor project) ---

export type EditorLanguage = "javascript" | "css";

export type EditorFile = {
  name: string;
  language: EditorLanguage;
  content: string;
};

export type ConsoleLevel = "log" | "info" | "warn" | "error";

export type ConsoleEntry = {
  id: string;
  level: ConsoleLevel;
  message: string;
  timestamp: string;
};

export type PreviewStatus = "ready" | "running" | "error" | "cleared";

export type PreviewError = {
  fileName?: string;
  line?: number;
  column?: number;
  message: string;
};

export type PreviewStatusPayload = {
  status: PreviewStatus;
  error?: PreviewError;
};

// --- Programming question types ---

export type ChallengeMode = "function" | "component";

/** Test case for a pure JavaScript function challenge */
export type FunctionTestCase = {
  id: string;
  name: string;
  input?: unknown[];
  expected?: unknown;
  hidden?: boolean;
};

/** Test case for a React component challenge */
export type ComponentTestCase = {
  id: string;
  name: string;
  props?: Record<string, unknown>;
  expectedContains?: string[];
  expectedElement?: string;
  hidden?: boolean;
};

export type TestCase = FunctionTestCase | ComponentTestCase;

/** Result of a single test case execution */
export type TestCaseResult = {
  testCaseId: string;
  name: string;
  passed: boolean;
  actual: unknown;
  expected?: unknown;
  runtimeMs: number;
  error: string | null;
};

/** Response from the run-code API / Edge Function */
export type RunCodeResponse = {
  success: boolean;
  results: TestCaseResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
  error?: string;
};

// --- Type guards ---

export function isFunctionTestCase(tc: TestCase): tc is FunctionTestCase {
  return "input" in tc && "expected" in tc;
}

export function isComponentTestCase(tc: TestCase): tc is ComponentTestCase {
  return "props" in tc && "expectedContains" in tc;
}
