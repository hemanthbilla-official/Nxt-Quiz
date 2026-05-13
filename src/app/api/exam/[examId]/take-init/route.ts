import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocalEnvironment, resolveUserIdForLocalBypass } from "@/lib/local-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const { examId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLocal = isLocalEnvironment();
  const userId = await resolveUserIdForLocalBypass(user?.id);

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const admin = createAdminClient();

  // SEC: Verify user is a participant of this exam (or an admin)
  const { data: participant } = await admin
    .from("exam_participants")
    .select("status")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    // Check if user is admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }
  }

  // Get attempt
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, server_due_at, status")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Get questions (querying tables directly to bypass view restrictions)
  const { data: examQuestions } = await admin
    .from("exam_questions")
    .select(`
      position,
      points,
      questions (
        id,
        topic,
        difficulty,
        question_type,
        question,
        code_snippet,
        options,
        tags
      )
    `)
    .eq("exam_id", examId)
    .order("position");

  const formattedQuestions = (examQuestions || []).map((eq: any) => ({
    ...eq.questions,
    position: eq.position,
    points: eq.points,
  }));

  // Get existing answers
  const { data: existingAnswers } = await admin
    .from("attempt_answers")
    .select("question_id, selected_option_id, is_bookmarked, is_skipped")
    .eq("attempt_id", attempt.id);

  // Get server time with fallback
  let serverNow = Date.now();
  try {
    const { data: serverTimeData, error: rpcError } = await admin.rpc("get_server_time");
    if (!rpcError && serverTimeData) {
      serverNow = new Date(serverTimeData).getTime();
    }
  } catch (err) {
    console.error("Failed to get server time:", err instanceof Error ? err.message : "Unknown");
  }

  return NextResponse.json({
    attempt,
    questions: formattedQuestions,
    answers: existingAnswers || [],
    serverNow,
  });
}
