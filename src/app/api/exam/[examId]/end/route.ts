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

  const { data: activeAttempts } = await supabase
    .from("attempts")
    .select("id, user_id")
    .eq("exam_id", examId)
    .eq("status", "active");

  const submittedAt = new Date().toISOString();

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

  await supabase
    .from("exam_participants")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
    })
    .eq("exam_id", examId)
    .eq("status", "active");

  await supabase
    .from("exams")
    .update({
      status: "closed",
      closes_at: submittedAt,
    })
    .eq("id", examId);

  return NextResponse.json({ success: true });
}
