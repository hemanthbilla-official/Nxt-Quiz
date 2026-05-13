import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { nanoid } from "nanoid";
import { assertSameOriginRequest } from "@/lib/request-security";
import { normalizeEditorFiles, serializeCodeFiles } from "@/lib/code-answer";

export async function GET(_request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const url = new URL(_request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") || "100")));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: questions, error, count } = await supabase
    .from("questions")
    .select(
      `
      *,
      exam_questions (
        exams (
          id,
          title,
          exam_code
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ questions: questions || [], total: count || 0, page, pageSize });
}

export async function POST(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    topic,
    difficulty,
    question_type,
    question,
    code_snippet,
    options,
    correct_option_id,
    explanation,
    tags,
    starter_code,
    starter_files,
    function_name,
    challenge_mode,
    test_cases,
    language,
    points,
  } = body;

  const isProgramming = question_type === "programming";
  const starterFiles = normalizeEditorFiles(starter_files, []);
  const normalizedStarterCode =
    starterFiles.length > 0 ? serializeCodeFiles(starterFiles) : starter_code;
  const normalizedChallengeMode = challenge_mode || "function";
  const normalizedFunctionName =
    isProgramming && normalizedChallengeMode === "component"
      ? function_name || "App"
      : function_name;

  if (!topic || typeof topic !== "string" || !question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Topic and question are required." },
      { status: 400 }
    );
  }

  if (!isProgramming && (!correct_option_id || !Array.isArray(options) || options.length < 2)) {
    return NextResponse.json(
      { error: "MCQ questions require options (min 2) and a correct answer." },
      { status: 400 }
    );
  }

  if (
    isProgramming &&
    (!normalizedStarterCode ||
      !normalizedFunctionName ||
      !normalizedChallengeMode ||
      !Array.isArray(test_cases) ||
      test_cases.length < 1)
  ) {
    return NextResponse.json(
      { error: "Programming questions require starter_code, function_name, challenge_mode, and at least 1 test case." },
      { status: 400 }
    );
  }

  const sanitize = (s: string) =>
    s.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));

  const supabase = createAdminClient();
  const id = typeof body.id === "string" && body.id.trim()
    ? body.id.trim()
    : `q-${nanoid(12)}`;

  const insertData: Record<string, unknown> = {
    id,
    topic: sanitize(topic.trim()),
    difficulty: difficulty || "Basic",
    question_type: question_type || "theory",
    question: sanitize(question.trim()),
    points: points || 1,
    tags: tags || [],
  };

  if (isProgramming) {
    insertData.starter_code = normalizedStarterCode;
    insertData.function_name = normalizedFunctionName;
    insertData.challenge_mode = normalizedChallengeMode;
    insertData.test_cases = test_cases;
    insertData.language = language || "javascript";
    insertData.options = null;
    insertData.correct_option_id = null;
    insertData.explanation = null;
  } else {
    insertData.code_snippet = code_snippet ? sanitize(code_snippet) : null;
    insertData.options = typeof options === "string" ? options : JSON.stringify(options);
    insertData.correct_option_id = correct_option_id;
    insertData.explanation = explanation ? sanitize(explanation) : "";
  }

  const { data, error } = await supabase
    .from("questions")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, question: data });
}

// DELETE — bulk delete all questions
export async function DELETE(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // 1. Critical: Disable in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Bulk deletion is disabled in production." },
      { status: 403 }
    );
  }

  // 2. Critical: Require strict confirmation
  const { confirmation } = await request.json().catch(() => ({}));
  if (confirmation !== "WIPE QUESTIONS") {
    return NextResponse.json(
      { error: "Confirmation 'WIPE QUESTIONS' required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // BUG-H FIX: Block bulk delete if any exam is in_progress
  const { data: activeExams } = await supabase
    .from("exams")
    .select("id")
    .eq("status", "in_progress")
    .limit(1);

  if (activeExams && activeExams.length > 0) {
    return NextResponse.json(
      { error: "Cannot wipe questions while exams are in progress. End all active exams first." },
      { status: 400 }
    );
  }

  // Wipe all related data first
  await supabase.from("exam_questions").delete().neq("question_id", "sentinel");
  await supabase.from("attempt_answers").delete().neq("question_id", "sentinel");

  const { error } = await supabase
    .from("questions")
    .delete()
    .neq("id", "sentinel");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
