import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForLocalBypass } from "@/lib/local-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
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

  const { data: attempt } = await admin
    .from("attempts")
    .select("id, submitted_at, server_started_at, status, total_score, max_score")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  const { data: exam } = await admin
    .from("exams")
    .select("title, status")
    .eq("id", examId)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  // Calculate rank
  let rank = null;
  let totalParticipants = 0;
  if (attempt && attempt.total_score !== null) {
    const { data: allAttempts } = await admin
      .from("attempts")
      .select("total_score")
      .eq("exam_id", examId)
      .eq("status", "submitted")
      .not("total_score", "is", null);
      
    if (allAttempts) {
      totalParticipants = allAttempts.length;
      // Sort in descending order
      const scores = allAttempts.map(a => a.total_score).sort((a, b) => b - a);
      // Find the index of the user's score (1-based rank)
      rank = scores.indexOf(attempt.total_score) + 1;
    }
  }

  return NextResponse.json({
    attempt: attempt ? { ...attempt, rank, totalParticipants } : null,
    exam: {
      title: exam.title,
      status: exam.status
    }
  });
}
