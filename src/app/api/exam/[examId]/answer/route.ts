import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForLocalBypass } from "@/lib/local-user";

// SEC-05: Answer route — derive attemptId server-side instead of trusting client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;
  const body = await request.json();
  const { questionId, selected_option_id, is_bookmarked, is_skipped } = body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // BUG-01: Fix operator precedence
  const userId = await resolveUserIdForLocalBypass(user?.id);

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  // Check exam is still active
  const admin = createAdminClient();
  const { data: exam } = await admin
    .from("exams")
    .select("status")
    .eq("id", examId)
    .single();

  if (exam?.status !== "in_progress") {
    return NextResponse.json({ error: "Exam is not active" }, { status: 400 });
  }

  // SEC-05: Server-side derivation of attemptId — never trust client-supplied value
  const { data: attempt } = await admin
    .from("attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Active attempt not found" }, { status: 404 });
  }

  // Upsert answer using server-derived attempt.id
  const { error } = await admin.from("attempt_answers").upsert(
    {
      attempt_id: attempt.id,
      question_id: questionId,
      selected_option_id: selected_option_id || null,
      is_bookmarked: is_bookmarked || false,
      is_skipped: is_skipped || false,
      answered_at: selected_option_id ? new Date().toISOString() : null,
      cleared_at: !selected_option_id ? new Date().toISOString() : null,
    },
    { onConflict: "attempt_id,question_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
