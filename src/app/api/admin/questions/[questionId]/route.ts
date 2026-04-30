import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { assertSameOriginRequest } from "@/lib/request-security";

const sanitize = (value: string) =>
  value.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));

// GET — get a single question
export async function GET(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: question, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question });
}

// PATCH — update a question
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { questionId } = await params;
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const {
    topic, difficulty, question_type, question, code_snippet,
    options, correct_option_id, explanation, tags,
    // Programming fields
    starter_code, function_name, challenge_mode, test_cases, language, points,
  } = body;

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (topic && typeof topic === "string") updates.topic = sanitize(topic.trim());
  if (difficulty) updates.difficulty = difficulty;
  if (question_type) updates.question_type = question_type;
  if (question && typeof question === "string") updates.question = sanitize(question.trim());
  if (code_snippet !== undefined) {
    updates.code_snippet = typeof code_snippet === "string" ? sanitize(code_snippet) : null;
  }
  if (options) updates.options = typeof options === 'string' ? options : JSON.stringify(options);
  if (correct_option_id !== undefined) updates.correct_option_id = correct_option_id;
  if (explanation !== undefined) {
    updates.explanation = typeof explanation === "string" ? sanitize(explanation) : "";
  }
  if (tags) updates.tags = tags;
  if (points !== undefined) updates.points = points;
  // Programming fields
  if (starter_code !== undefined) updates.starter_code = starter_code;
  if (function_name !== undefined) updates.function_name = function_name;
  if (challenge_mode !== undefined) updates.challenge_mode = challenge_mode;
  if (test_cases !== undefined) updates.test_cases = test_cases;
  if (language !== undefined) updates.language = language;

  const { data, error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", questionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, question: data });
}

// DELETE — remove a question from the bank
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { questionId } = await params;
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Note: This might fail if the question is used in an exam (foreign key constraint)
  // We should handle that or delete from exam_questions first.
  await supabase.from("exam_questions").delete().eq("question_id", questionId);
  await supabase.from("attempt_answers").delete().eq("question_id", questionId);

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
