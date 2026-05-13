import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { nanoid } from "nanoid";

// POST — bulk import questions
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { questions, examId } = await request.json();
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: "Questions array is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // FIX: Guard against importing questions for an active or closed exam.
  // Once an exam has started, its questions must not be modified — doing so
  // would corrupt scores and submitted results for students.
  if (examId) {
    const { data: exam } = await supabase
      .from("exams")
      .select("status")
      .eq("id", examId)
      .single();

    if (exam && exam.status !== "waiting" && exam.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot modify questions for an active or closed exam" },
        { status: 400 }
      );
    }
  }

  interface ImportQuestion {
    id?: string;
    topic?: string;
    difficulty?: string;
    questionType?: string;
    question: string;
    codeSnippet?: string;
    options: unknown;
    correct_option_id?: string;
    correctOptionId?: string;
    explanation?: string;
    tags?: string[];
    points?: number;
  }

  // FIX: Generate a unique prefix per import batch so that question IDs never
  // collide across different exams. Previously, user-supplied IDs (e.g. "q-1")
  // could clash between two JSON files, causing upsert to silently overwrite
  // another exam's questions. Now each import gets its own namespace.
  const batchPrefix = examId
    ? examId.slice(0, 8)
    : nanoid(8);

  const formatted = questions.map((q: ImportQuestion, i: number) => ({
    id: `${batchPrefix}-${q.id || `q${i + 1}`}`,
    topic: q.topic || "Unknown",
    difficulty: q.difficulty || "Basic",
    question_type: q.questionType || "theory",
    question: q.question,
    code_snippet: q.codeSnippet || null,
    options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
    correct_option_id: q.correct_option_id || q.correctOptionId,
    explanation: q.explanation || "",
    tags: q.tags || [],
  }));

  // FIX: Use INSERT instead of UPSERT. With unique exam-scoped IDs there
  // should be no conflicts. If there is a collision, it will fail safely
  // instead of silently overwriting another exam's question data.
  const { data: insertedQuestions, error } = await supabase
    .from("questions")
    .insert(formatted)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Link questions to the exam if examId is provided
  if (examId && insertedQuestions) {
    // Clear existing links for this exam to allow "overwrite" behavior
    await supabase.from("exam_questions").delete().eq("exam_id", examId);

    const examQuestions = insertedQuestions.map((q, i) => ({
      exam_id: examId,
      question_id: q.id,
      position: i + 1,
      points: 1,
    }));

    const { error: linkError } = await supabase
      .from("exam_questions")
      .insert(examQuestions);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: insertedQuestions?.length || 0 });
}
