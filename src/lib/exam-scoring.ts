import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocalEnvironment, isLocalSupabaseUrl } from "@/lib/local-user";

export type ChallengeMode = "function" | "component";

type JsonRecord = Record<string, unknown>;

type AttemptAnswerRow = {
  question_id: string;
  selected_option_id: string | null;
  code_answer?: string | null;
};

type ExamQuestionRow = {
  question_id: string;
  points: number;
};

type QuestionRow = {
  id: string;
  correct_option_id: string | null;
  question_type: string;
  function_name: string | null;
  challenge_mode: ChallengeMode | null;
  test_cases: unknown;
};

type RunCodeSummary = {
  passed: number;
  failed: number;
  total: number;
};

export type RunCodeResult = {
  success: boolean;
  results: JsonRecord[];
  summary: RunCodeSummary;
  error?: string;
};

type ProgrammingTask = {
  questionId: string;
  points: number;
  code: string;
  testCases: unknown[];
  functionName: string;
  challengeMode: ChallengeMode;
};

export const MAX_CODE_BYTES = 200_000;
export const SUBMISSION_GRACE_MS = 60_000;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asTestCases(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isHiddenTestCase(value: unknown) {
  const testCase = asRecord(value);
  const explicitlyPublic =
    testCase.public === true ||
    testCase.isPublic === true ||
    testCase.visibility === "public";

  return !explicitlyPublic || testCase.hidden === true || testCase.isHidden === true;
}

function asSummary(value: unknown): RunCodeSummary {
  const summary = asRecord(value);
  const passed = Number(summary.passed);
  const failed = Number(summary.failed);
  const total = Number(summary.total);

  return {
    passed: Number.isFinite(passed) && passed >= 0 ? passed : 0,
    failed: Number.isFinite(failed) && failed >= 0 ? failed : 0,
    total: Number.isFinite(total) && total > 0 ? total : 0,
  };
}

function shouldUseLocalCodeRunnerFallback(reason: unknown) {
  if (process.env.NODE_ENV === "production") return false;
  if (!isLocalEnvironment() && !isLocalSupabaseUrl()) return false;

  const message =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? reason.message
        : JSON.stringify(reason);

  return message.toLowerCase().includes("name resolution failed");
}

export function sanitizeFunctionName(functionName: unknown) {
  if (typeof functionName !== "string" || !/^[A-Za-z_$][\w$]{0,80}$/.test(functionName)) {
    return null;
  }

  return functionName;
}

export function isCodeSizeAllowed(code: string) {
  return new TextEncoder().encode(code).length <= MAX_CODE_BYTES;
}

export function sanitizeTestCasesForClient(testCases: unknown) {
  return asTestCases(testCases).map((testCase, index) => {
    const row = asRecord(testCase);
    const hidden = isHiddenTestCase(row);
    const id = typeof row.id === "string" ? row.id : `tc-${index + 1}`;

    if (hidden) {
      return {
        id,
        name: `Hidden test ${index + 1}`,
        hidden: true,
      };
    }

    return {
      id,
      name: typeof row.name === "string" ? row.name : `Test ${index + 1}`,
      input: Array.isArray(row.input) ? row.input : undefined,
      expected: row.expected,
      props: asRecord(row.props),
      expectedElement:
        typeof row.expectedElement === "string" ? row.expectedElement : undefined,
      expectedContains: Array.isArray(row.expectedContains)
        ? row.expectedContains
        : undefined,
      public: true,
    };
  });
}

export function sanitizeRunCodeResponse(
  result: unknown,
  testCases: unknown,
): RunCodeResult {
  const response = asRecord(result);
  const sourceResults = Array.isArray(response.results) ? response.results : [];
  const testsById = new Map(
    asTestCases(testCases).map((testCase, index) => {
      const row = asRecord(testCase);
      const id = typeof row.id === "string" ? row.id : `tc-${index + 1}`;
      return [id, row] as const;
    }),
  );

  return {
    success: response.success === true,
    summary: asSummary(response.summary),
    error: typeof response.error === "string" ? response.error : undefined,
    results: sourceResults.map((item, index) => {
      const row = asRecord(item);
      const testCaseId =
        typeof row.testCaseId === "string" ? row.testCaseId : `tc-${index + 1}`;
      const testCase = testsById.get(testCaseId) ?? {};
      const hidden = isHiddenTestCase(testCase);

      return {
        testCaseId,
        name: hidden
          ? `Hidden test ${index + 1}`
          : typeof row.name === "string"
            ? row.name
            : `Test ${index + 1}`,
        passed: row.passed === true,
        runtimeMs: typeof row.runtimeMs === "number" ? row.runtimeMs : 0,
        error: hidden ? null : typeof row.error === "string" ? row.error : null,
        actual: hidden ? undefined : row.actual,
      };
    }),
  };
}

async function callRunCodeFunction(task: ProgrammingTask) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const edgeFunctionKey =
    process.env.APP_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !edgeFunctionKey) {
    throw new Error("Code execution is not configured.");
  }

  const requestBody = {
    code: task.code,
    testCases: task.testCases,
    functionName: task.functionName,
    challengeMode: task.challengeMode,
  };

  async function runLocalFallback(reason: unknown) {
    console.warn("Using local code runner fallback for scoring:", reason);
    const { executeCodeLocally } = await import("@/lib/local-code-runner");

    return executeCodeLocally(requestBody);
  }

  try {
    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/run-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${edgeFunctionKey}`,
        apikey: edgeFunctionKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!edgeRes.ok) {
      const errorText = await edgeRes.text();
      if (shouldUseLocalCodeRunnerFallback(errorText)) {
        return runLocalFallback(errorText);
      }

      throw new Error(`Code execution failed: ${errorText}`);
    }

    return edgeRes.json() as Promise<RunCodeResult>;
  } catch (error) {
    if (shouldUseLocalCodeRunnerFallback(error)) {
      return runLocalFallback(error);
    }

    throw error;
  }
}

export async function scoreAttempt({
  supabase,
  examId,
  attemptId,
}: {
  supabase: SupabaseClient;
  examId: string;
  attemptId: string;
}) {
  const { data: questionAnswers } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_option_id, code_answer")
    .eq("attempt_id", attemptId);

  const { data: examQuestions } = await supabase
    .from("exam_questions")
    .select("question_id, points")
    .eq("exam_id", examId);

  const examQuestionRows = (examQuestions ?? []) as ExamQuestionRow[];
  const answerRows = (questionAnswers ?? []) as AttemptAnswerRow[];
  const questionIds = examQuestionRows.map((eq) => eq.question_id);

  const { data: questions } = await supabase
    .from("questions")
    .select("id, correct_option_id, question_type, function_name, challenge_mode, test_cases")
    .in("id", questionIds.length > 0 ? questionIds : ["__none__"]);

  const questionRows = (questions ?? []) as QuestionRow[];
  const questionMap = new Map(questionRows.map((question) => [question.id, question]));
  const answerMap = new Map(answerRows.map((answer) => [answer.question_id, answer]));
  const maxScore = examQuestionRows.reduce((sum, question) => sum + question.points, 0);
  let totalScore = 0;

  const programmingTasks: ProgrammingTask[] = [];

  for (const examQuestion of examQuestionRows) {
    const question = questionMap.get(examQuestion.question_id);
    const answer = answerMap.get(examQuestion.question_id);

    if (!question) continue;

    if (question.question_type === "programming") {
      const functionName = sanitizeFunctionName(
        question.function_name || (question.challenge_mode === "component" ? "App" : null),
      );
      const testCases = asTestCases(question.test_cases);

      if (
        answer?.code_answer?.trim() &&
        isCodeSizeAllowed(answer.code_answer) &&
        functionName &&
        testCases.length > 0
      ) {
        programmingTasks.push({
          questionId: examQuestion.question_id,
          points: examQuestion.points,
          code: answer.code_answer,
          testCases,
          functionName,
          challengeMode: question.challenge_mode || "function",
        });
      }

      continue;
    }

    if (answer?.selected_option_id === question.correct_option_id) {
      totalScore += examQuestion.points;
    }
  }

  for (const task of programmingTasks) {
    try {
      const result = await callRunCodeFunction(task);
      const total = result.summary?.total || 0;
      const passed = result.summary?.passed || 0;
      const score = total > 0 ? Math.round((passed / total) * task.points * 100) / 100 : 0;
      totalScore += score;

      await supabase
        .from("attempt_answers")
        .update({
          last_run_results: result,
          last_run_at: new Date().toISOString(),
          test_pass_count: passed,
          test_fail_count: Math.max(0, total - passed),
        })
        .eq("attempt_id", attemptId)
        .eq("question_id", task.questionId);
    } catch (error) {
      console.error(`Failed to score programming question ${task.questionId}:`, error);
    }
  }

  return { totalScore, maxScore };
}
