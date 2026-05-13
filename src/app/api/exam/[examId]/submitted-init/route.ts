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

  // Get attempt
  const { data: attempt } = await admin
    .from("attempts")
    .select("submitted_at, status, total_score, max_score")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  // Get exam title and status
  const { data: exam } = await admin
    .from("exams")
    .select("title, status")
    .eq("id", examId)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  return NextResponse.json({
    attempt: attempt || null,
    exam: {
      title: exam.title,
      status: exam.status
    }
  });
}
