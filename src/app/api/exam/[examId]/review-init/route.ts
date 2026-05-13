import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForLocalBypass } from "@/lib/local-user";

type ReviewQuestionRow = {
  position: number;
  questions: {
    id: string;
    topic: string;
    question: string;
  } | { id: string; topic: string; question: string }[] | null;
};

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
    .select("id, server_due_at, status")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const { data: examQuestions } = await admin
    .from("exam_questions")
    .select(`
      position,
      questions (
        id,
        topic,
        question
      )
    `)
    .eq("exam_id", examId)
    .order("position");

  const formattedQuestions = ((examQuestions || []) as unknown as ReviewQuestionRow[]).map((eq) => {
    const question = Array.isArray(eq.questions) ? eq.questions[0] : eq.questions;
    return {
      ...(question ?? {}),
      position: eq.position,
    };
  });

  const { data: answers } = await admin
    .from("attempt_answers")
    .select("question_id, selected_option_id, is_bookmarked, is_skipped, code_answer, test_pass_count, test_fail_count")
    .eq("attempt_id", attempt.id);

  const { data: serverTimeData } = await admin.rpc("get_server_time");
  const serverNow = serverTimeData
    ? new Date(serverTimeData).getTime()
    : Date.now();

  return NextResponse.json({
    attempt,
    questions: formattedQuestions,
    answers: answers || [],
    serverNow,
  });
}
