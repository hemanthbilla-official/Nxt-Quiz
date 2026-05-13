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
    .select("id, status")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "submitted") {
    return NextResponse.json(
      { error: "Exam is not submitted yet" },
      { status: 403 }
    );
  }

  const { data: answers } = await admin
    .from("attempt_answers")
    .select("question_id, selected_option_id, code_answer, test_pass_count, test_fail_count")
    .eq("attempt_id", attempt.id);

  const { data: exam } = await admin
    .from("exams")
    .select("status")
    .eq("id", examId)
    .single();

  const isExamClosed = exam?.status === "closed";

  const { data: examQuestions } = await admin
    .from("exam_questions")
    .select(`
      position,
      points,
      questions (
        id,
        topic,
        question_type,
        challenge_mode,
        question,
        code_snippet,
        options,
        correct_option_id,
        explanation,
        test_cases
      )
    `)
    .eq("exam_id", examId)
    .order("position");

  if (!examQuestions) {
    return NextResponse.json({ results: [] });
  }

  const answersMap = new Map(answers?.map((a) => [a.question_id, a]) || []);

  interface ExamQuestionWithDetails {
    position: number;
    points: number;
    questions: {
      id: string;
      topic: string;
      question_type: string;
      challenge_mode: "function" | "component" | null;
      question: string;
      code_snippet: string | null;
      options: string | { id: string; text: string }[];
      correct_option_id: string | null;
      explanation: string;
      test_cases: unknown;
    };
  }

  const formattedResults = (examQuestions as unknown as ExamQuestionWithDetails[]).map((eq) => {
    const q = eq.questions;
    const answer = answersMap.get(q.id);
    const isProgramming = q.question_type === "programming";
    const codeAnswer =
      isProgramming && typeof answer?.code_answer === "string"
        ? answer.code_answer
        : null;
    const testPassCount = Number(answer?.test_pass_count ?? 0);
    const testFailCount = Number(answer?.test_fail_count ?? 0);
    const testTotalCount = testPassCount + testFailCount;
    const selectedOptionId =
      !isProgramming && typeof answer?.selected_option_id === "string"
        ? answer.selected_option_id
        : null;
    const isSkipped = isProgramming
      ? !codeAnswer?.trim()
      : !selectedOptionId;
    const isCorrect = !isExamClosed
      ? null
      : isProgramming
        ? !!codeAnswer?.trim() && testTotalCount > 0 && testFailCount === 0
        : !!selectedOptionId && selectedOptionId === q.correct_option_id;

    return {
      id: q.id,
      position: eq.position,
      points: eq.points,
      topic: q.topic,
      questionType: q.question_type,
      challengeMode: q.challenge_mode,
      question: q.question,
      codeSnippet: q.code_snippet,
      options: isProgramming
        ? []
        : typeof q.options === "string"
          ? JSON.parse(q.options)
          : q.options || [],
      correctOptionId: !isProgramming && isExamClosed ? q.correct_option_id : null,
      explanation: isExamClosed ? q.explanation : "Answers will be visible once the instructor closes the exam.",
      selectedOptionId,
      codeAnswer,
      testPassCount,
      testFailCount,
      testTotalCount,
      isSkipped,
      isCorrect,
    };
  });

  return NextResponse.json({ results: formattedResults, isPublished: isExamClosed });
}
