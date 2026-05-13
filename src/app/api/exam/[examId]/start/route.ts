import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: exam, error } = await supabase.rpc("admin_start_exam", {
    p_exam_id: examId,
    p_admin_user_id: admin.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (exam.status !== "waiting") {
    return NextResponse.json(
      { error: "Exam must be in waiting status" },
      { status: 400 },
    );
  }

  const { count: questionCount } = await supabase
    .from("exam_questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (!questionCount || questionCount === 0) {
    return NextResponse.json(
      { error: "Cannot start an exam with no questions. Please add questions first." },
      { status: 400 },
    );
  }

  const now = new Date();
  const closesAt = new Date(now.getTime() + exam.duration_seconds * 1000);

  const { error: updateError } = await supabase
    .from("exams")
    .update({
      status: "in_progress",
      starts_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
    })
    .eq("id", examId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: participants } = await supabase
    .from("exam_participants")
    .select("user_id")
    .eq("exam_id", examId)
    .eq("status", "waiting");

  if (participants && participants.length > 0) {
    const { data: examQuestions } = await supabase
      .from("exam_questions")
      .select("points")
      .eq("exam_id", examId);

    const maxScore = examQuestions?.reduce((sum, q) => sum + q.points, 0) || 0;

    const attempts = participants.map((p) => ({
      exam_id: examId,
      user_id: p.user_id,
      server_started_at: now.toISOString(),
      server_due_at: closesAt.toISOString(),
      max_score: maxScore,
      status: "active" as const,
    }));

    await supabase.from("attempts").upsert(attempts, {
      onConflict: "exam_id,user_id",
    });

    await supabase
      .from("exam_participants")
      .update({ status: "active", started_at: now.toISOString() })
      .eq("exam_id", examId)
      .eq("status", "waiting");
  }

  return NextResponse.json({ success: true, startsAt: now.toISOString() });
}
