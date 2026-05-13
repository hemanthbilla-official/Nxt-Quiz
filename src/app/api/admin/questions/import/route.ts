import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { nanoid } from "nanoid";
import { assertSameOriginRequest } from "@/lib/request-security";
import { normalizeEditorFiles, serializeCodeFiles } from "@/lib/code-answer";

export async function POST(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { questions, examId } = await request.json();
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: "Questions array is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

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
    question_type?: string;
    question: string;
    codeSnippet?: string;
    code_snippet?: string;
    options?: unknown;
    correct_option_id?: string;
    correctOptionId?: string;
    explanation?: string;
    tags?: string[];
    points?: number;
    starterCode?: string;
    starter_code?: string;
    starterFiles?: unknown;
    starter_files?: unknown;
    functionName?: string;
    function_name?: string;
    challengeMode?: string;
    challenge_mode?: string;
    testCases?: unknown;
    test_cases?: unknown;
    language?: string;
  }

  const batchPrefix = examId
    ? examId.slice(0, 8)
    : nanoid(8);

  const formatted = questions.map((q: ImportQuestion, i: number) => {
    const questionType = q.question_type || q.questionType || "theory";
    const challengeMode = q.challenge_mode || q.challengeMode || null;
    const isProgramming = questionType === "programming";
    const isComponent = isProgramming && challengeMode === "component";
    const starterFiles = normalizeEditorFiles(q.starter_files || q.starterFiles, []);
    const starterCode =
      starterFiles.length > 0
        ? serializeCodeFiles(starterFiles)
        : q.starter_code || q.starterCode || null;

    return {
      id: `${batchPrefix}-${q.id || `q${i + 1}`}`,
      topic: q.topic || "Unknown",
      difficulty: q.difficulty || "Basic",
      question_type: questionType,
      question: q.question,
      code_snippet: q.code_snippet || q.codeSnippet || null,
      options: isProgramming
        ? null
        : typeof q.options === "string"
          ? q.options
          : JSON.stringify(q.options),
      correct_option_id: isProgramming ? null : q.correct_option_id || q.correctOptionId || null,
      explanation: q.explanation || "",
      tags: q.tags || [],
      starter_code: starterCode,
      function_name: q.function_name || q.functionName || (isComponent ? "App" : null),
      challenge_mode: challengeMode,
      test_cases: q.test_cases || q.testCases || null,
      language: q.language || "javascript",
    };
  });

  const { data: insertedQuestions, error } = await supabase
    .from("questions")
    .insert(formatted)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (examId && insertedQuestions) {
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
