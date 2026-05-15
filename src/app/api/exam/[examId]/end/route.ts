import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { scoreAttempt } from "@/lib/exam-scoring";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, status")
    .eq("id", examId)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  if (exam.status !== "in_progress") {
    return NextResponse.json(
      { error: "Exam must be in progress to end it" },
      { status: 400 }
    );
  }

  const submittedAt = new Date().toISOString();

  // 1. Close the exam immediately so clients are notified via realtime
  await supabase
    .from("exams")
    .update({
      status: "closed",
      closes_at: submittedAt,
    })
    .eq("id", examId);

  // 2. Wait to allow clients to flush their pending answers and auto-submit
  await new Promise(resolve => setTimeout(resolve, 2500));

  // 3. Fetch any remaining active attempts (offline or slow clients)
  const { data: activeAttempts } = await supabase
    .from("attempts")
    .select("id, user_id")
    .eq("exam_id", examId)
    .eq("status", "active");

  for (const attempt of activeAttempts || []) {
    const { totalScore, maxScore } = await scoreAttempt({
      supabase,
      examId,
      attemptId: attempt.id,
    });

    await supabase
      .from("attempts")
      .update({
        status: "submitted",
        submitted_at: submittedAt,
        total_score: totalScore,
        max_score: maxScore,
      })
      .eq("id", attempt.id);
  }

  // Also close participants who are still active
  await supabase
    .from("exam_participants")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
    })
    .eq("exam_id", examId)
    .eq("status", "active");

  return NextResponse.json({ success: true });
}
