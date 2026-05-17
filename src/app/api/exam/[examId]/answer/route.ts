import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForLocalBypass } from "@/lib/local-user";
import { isCodeSizeAllowed, SUBMISSION_GRACE_MS } from "@/lib/exam-scoring";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const body = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = await resolveUserIdForLocalBypass(user?.id);

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: exam } = await admin
    .from("exams")
    .select("status, closes_at")
    .eq("id", examId)
    .single();

  // Allow writes for in_progress exams or closed exams within grace window
  const isInProgress = exam?.status === "in_progress";
  const isClosedWithinGrace = exam?.status === "closed" && exam?.closes_at && 
    (Date.now() < new Date(exam.closes_at).getTime() + SUBMISSION_GRACE_MS);

  if (!isInProgress && !isClosedWithinGrace) {
    return NextResponse.json({ error: "Exam is not active" }, { status: 400 });
  }

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

  // Only enforce time window when exam is still in_progress
  if (isInProgress && Date.now() > new Date(attempt.server_due_at).getTime()) {
    return NextResponse.json({ error: "Exam time has expired" }, { status: 403 });
  }

  if (body.answers && typeof body.answers === 'object') {
    const upsertArray = Object.entries(body.answers).map(([qId, state]: [string, any]) => {
      const upsertData: Record<string, unknown> = {
        attempt_id: attempt.id,
        question_id: qId,
        is_bookmarked: state.is_bookmarked || false,
        is_skipped: state.is_skipped || false,
      };

      if (state.code_answer !== undefined) {
        if (typeof state.code_answer === "string" && isCodeSizeAllowed(state.code_answer)) {
          upsertData.code_answer = state.code_answer;
          upsertData.code_language = state.code_language || "javascript";
        }
      } else {
        upsertData.selected_option_id = state.selected_option_id || null;
        upsertData.answered_at = state.selected_option_id ? new Date().toISOString() : null;
        upsertData.cleared_at = !state.selected_option_id ? new Date().toISOString() : null;
      }
      return upsertData;
    });

    if (upsertArray.length > 0) {
      const { error } = await admin.from("attempt_answers").upsert(
        upsertArray,
        { onConflict: "attempt_id,question_id" }
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    return NextResponse.json({ success: true });
  }

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

  const { data: examQuestion } = await admin
    .from("exam_questions")
    .select("question_id")
    .eq("exam_id", examId)
    .eq("question_id", questionId)
    .single();

  if (!examQuestion) {
    return NextResponse.json({ error: "Question is not part of this exam" }, { status: 400 });
  }

  const upsertData: Record<string, unknown> = {
    attempt_id: attempt.id,
    question_id: questionId,
    is_bookmarked: is_bookmarked || false,
    is_skipped: is_skipped || false,
  };

  if (code_answer !== undefined) {
    upsertData.code_answer = code_answer;
    upsertData.code_language = code_language || "javascript";
  } else {
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
