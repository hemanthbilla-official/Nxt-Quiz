import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeLocalBypassEnabled, LOCAL_STUDENT_ID } from "@/lib/environment";
import { scoreAttempt, SUBMISSION_GRACE_MS } from "@/lib/exam-scoring";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const { attemptId } = await request.json().catch(() => ({}));

  if (typeof attemptId !== "string") {
    return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
  }

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

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, status, server_due_at")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status === "submitted") {
    return NextResponse.json({ message: "Already submitted" });
  }

  const dueAt = new Date(attempt.server_due_at).getTime();
  if (Date.now() > dueAt + SUBMISSION_GRACE_MS) {
    return NextResponse.json({ error: "Submission window has expired" }, { status: 403 });
  }

  const { totalScore, maxScore } = await scoreAttempt({
    supabase: admin,
    examId,
    attemptId,
  });

  const submittedAt = new Date().toISOString();

  await admin
    .from("attempts")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
      total_score: totalScore,
      max_score: maxScore,
    })
    .eq("id", attemptId);

  await admin
    .from("exam_participants")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
    })
    .eq("exam_id", examId)
    .eq("user_id", userId);

  return NextResponse.json({ score: totalScore, maxScore });
}
