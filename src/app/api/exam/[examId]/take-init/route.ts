import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForLocalBypass } from "@/lib/local-user";
import {
  sanitizeRunCodeResponse,
  sanitizeTestCasesForClient,
} from "@/lib/exam-scoring";
import { getExamControls } from "@/lib/exam-controls";

type TakeQuestionRow = {
  position: number;
  points: number;
  questions: TakeQuestionDetails | TakeQuestionDetails[] | null;
};

type TakeQuestionDetails = {
  id: string;
  topic: string;
  difficulty: string;
  question_type: string;
  question: string;
  code_snippet: string | null;
  options: unknown;
  tags: string[];
  starter_code: string | null;
  function_name: string | null;
  challenge_mode: string | null;
  test_cases: unknown;
  language: string | null;
};

type ExistingAnswerRow = {
  question_id: string;
  selected_option_id: string | null;
  is_bookmarked: boolean;
  is_skipped: boolean;
  code_answer: string | null;
  last_run_results: unknown;
  test_pass_count: number | null;
  test_fail_count: number | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = await resolveUserIdForLocalBypass(user?.id);

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: participant } = await admin
    .from("exam_participants")
    .select("status")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }
  }

  const { data: attempt } = await admin
    .from("attempts")
    .select("id, server_due_at, status")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const { data: examQuestions } = await admin
    .from("exam_questions")
    .select(
      `
      position,
      points,
      questions (
        id,
        topic,
        difficulty,
        question_type,
        question,
        code_snippet,
        options,
        tags,
        starter_code,
        function_name,
        challenge_mode,
        test_cases,
        language
      )
    `,
    )
    .eq("exam_id", examId)
    .order("position");

  const testCasesByQuestionId = new Map<string, unknown>();
  const formattedQuestions = (
    (examQuestions || []) as unknown as TakeQuestionRow[]
  )
    .map((eq) => {
      const question = Array.isArray(eq.questions)
        ? eq.questions[0]
        : eq.questions;
      if (!question) return null;
      testCasesByQuestionId.set(question.id, question.test_cases);

      return {
        ...question,
        test_cases: sanitizeTestCasesForClient(question.test_cases),
        position: eq.position,
        points: eq.points,
      };
    })
    .filter((question) => question !== null);

  const { data: existingAnswers } = await admin
    .from("attempt_answers")
    .select(
      "question_id, selected_option_id, is_bookmarked, is_skipped, code_answer, last_run_results, test_pass_count, test_fail_count",
    )
    .eq("attempt_id", attempt.id);

  const safeExistingAnswers = (
    (existingAnswers || []) as ExistingAnswerRow[]
  ).map((answer) => ({
    ...answer,
    last_run_results: answer.last_run_results
      ? sanitizeRunCodeResponse(
          answer.last_run_results,
          testCasesByQuestionId.get(answer.question_id) || [],
        )
      : null,
  }));

  let serverNow = Date.now();
  try {
    const { data: serverTimeData, error: rpcError } =
      await admin.rpc("get_server_time");
    if (!rpcError && serverTimeData) {
      serverNow = new Date(serverTimeData).getTime();
    }
  } catch (err) {
    console.error(
      "Failed to get server time:",
      err instanceof Error ? err.message : "Unknown",
    );
  }

  return NextResponse.json({
    attempt,
    questions: formattedQuestions,
    answers: safeExistingAnswers,
    controls: await getExamControls(admin),
    serverNow,
  });
}
