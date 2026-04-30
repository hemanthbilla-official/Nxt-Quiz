import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeLocalBypassEnabled, LOCAL_STUDENT_ID } from "@/lib/environment";
import { isCodeSizeAllowed } from "@/lib/exam-scoring";
import { assertSameOriginRequest } from "@/lib/request-security";

// SEC-05: Answer route — derive attemptId server-side instead of trusting client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const body = await request.json();
  const { questionId, selected_option_id, is_bookmarked, is_skipped, code_answer, code_language } = body;

  if (typeof questionId !== "string" || questionId.trim().length === 0) {
    return NextResponse.json({ error: "questionId is required" }, { status: 400 });
  }

  if (
    selected_option_id !== undefined &&
    selected_option_id !== null &&
    !["A", "B", "C", "D"].includes(String(selected_option_id))
  ) {
    return NextResponse.json({ error: "Invalid selected option" }, { status: 400 });
  }

  if (code_answer !== undefined) {
    if (typeof code_answer !== "string" || !isCodeSizeAllowed(code_answer)) {
      return NextResponse.json({ error: "Code answer is too large" }, { status: 413 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // BUG-01: Fix operator precedence
  let userId = user?.id;
  if (!userId && isSafeLocalBypassEnabled()) {
    userId = LOCAL_STUDENT_ID;
  }

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  // SEC-05: Server-side derivation of attemptId — never trust client-supplied value
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, server_due_at")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Active attempt not found" }, { status: 404 });
  }

  if (Date.now() > new Date(attempt.server_due_at).getTime()) {
    return NextResponse.json({ error: "Exam time has expired" }, { status: 403 });
  }

  const { data: examQuestion } = await admin
    .from("exam_questions")
    .select("question_id")
    .eq("exam_id", examId)
    .eq("question_id", questionId)
    .single();

  if (!examQuestion) {
    return NextResponse.json({ error: "Question is not part of this exam" }, { status: 400 });
  }

  // Build upsert payload: programming questions use code_answer, MCQ uses selected_option_id
  const upsertData: Record<string, unknown> = {
    attempt_id: attempt.id,
    question_id: questionId,
    is_bookmarked: is_bookmarked || false,
    is_skipped: is_skipped || false,
  };

  if (code_answer !== undefined) {
    // Programming question answer
    upsertData.code_answer = code_answer;
    upsertData.code_language = code_language || "javascript";
  } else {
    // MCQ answer
    upsertData.selected_option_id = selected_option_id || null;
    upsertData.answered_at = selected_option_id ? new Date().toISOString() : null;
    upsertData.cleared_at = !selected_option_id ? new Date().toISOString() : null;
  }

  const { error } = await admin.from("attempt_answers").upsert(
    upsertData,
    { onConflict: "attempt_id,question_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
