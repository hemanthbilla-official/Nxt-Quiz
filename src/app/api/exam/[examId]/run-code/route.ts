import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeLocalBypassEnabled, LOCAL_STUDENT_ID } from "@/lib/environment";
import {
  isCodeSizeAllowed,
  sanitizeFunctionName,
  sanitizeRunCodeResponse,
} from "@/lib/exam-scoring";
import { assertSameOriginRequest } from "@/lib/request-security";

type ExamQuestionRow = {
  question_id: string;
  questions: {
    question_type: string;
    function_name: string | null;
    challenge_mode: "function" | "component" | null;
    test_cases: unknown;
  } | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const body = await request.json().catch(() => ({}));
  const { questionId, code, language } = body;

  if (typeof questionId !== "string" || typeof code !== "string") {
    return NextResponse.json(
      { error: "Missing questionId or code" },
      { status: 400 }
    );
  }

  if (!isCodeSizeAllowed(code)) {
    return NextResponse.json({ error: "Code is too large" }, { status: 413 });
  }

  // --- Auth: get user ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId = user?.id;
  const isLocal = isSafeLocalBypassEnabled();

  if (!userId && isLocal) {
    userId = LOCAL_STUDENT_ID;
  }

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  // --- Verify active attempt ---
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, server_due_at")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!attempt) {
    return NextResponse.json(
      { error: "Active attempt not found" },
      { status: 404 }
    );
  }

  if (Date.now() > new Date(attempt.server_due_at).getTime()) {
    return NextResponse.json({ error: "Exam time has expired" }, { status: 403 });
  }

  // --- Get question details (test_cases, function_name, challenge_mode) ---
  const { data: examQuestion } = await admin
    .from("exam_questions")
    .select(
      `
      question_id,
      questions (
        question_type,
        function_name,
        challenge_mode,
        test_cases
      )
    `
    )
    .eq("exam_id", examId)
    .eq("question_id", questionId)
    .single();

  const typedExamQuestion = examQuestion as ExamQuestionRow | null;

  if (!typedExamQuestion?.questions) {
    return NextResponse.json(
      { error: "Question not found in this exam" },
      { status: 404 }
    );
  }

  const question = typedExamQuestion.questions;

  if (question.question_type !== "programming") {
    return NextResponse.json(
      { error: "Question is not a programming challenge" },
      { status: 400 }
    );
  }

  const functionName = sanitizeFunctionName(
    question.function_name || (question.challenge_mode === "component" ? "App" : null)
  );
  if (!Array.isArray(question.test_cases) || !functionName) {
    return NextResponse.json(
      { error: "Question has no test cases or function name configured" },
      { status: 400 }
    );
  }

  // --- Save code answer to DB first ---
  await admin.from("attempt_answers").upsert(
    {
      attempt_id: attempt.id,
      question_id: questionId,
      code_answer: code,
      code_language: typeof language === "string" ? language : "javascript",
    },
    { onConflict: "attempt_id,question_id" }
  );

  // --- Call Supabase Edge Function ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/run-code`;

    const edgeRes = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        code,
        testCases: question.test_cases,
        functionName,
        challengeMode: question.challenge_mode || "function",
      }),
    });

    if (!edgeRes.ok) {
      const errorText = await edgeRes.text();
      console.error("Edge Function error:", errorText);
      return NextResponse.json(
        { error: "Code execution failed" },
        { status: 502 }
      );
    }

    const result = await edgeRes.json();
    const safeResult = sanitizeRunCodeResponse(result, question.test_cases);

    // --- Save results to DB ---
    await admin
      .from("attempt_answers")
      .update({
        last_run_results: result,
        last_run_at: new Date().toISOString(),
        test_pass_count: safeResult.summary.passed,
        test_fail_count: safeResult.summary.failed,
      })
      .eq("attempt_id", attempt.id)
      .eq("question_id", questionId);

    return NextResponse.json(safeResult);
  } catch (err) {
    console.error("Error calling Edge Function:", err);
    return NextResponse.json(
      { error: "Failed to execute code" },
      { status: 500 }
    );
  }
}
