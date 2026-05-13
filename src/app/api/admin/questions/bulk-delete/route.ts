import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { questionIds } = await request.json().catch(() => ({}));
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: "questionIds array is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: examLinks } = await supabase
    .from("exam_questions")
    .select("exam_id, exams!inner(status)")
    .in("question_id", questionIds)
    .in("exams.status", ["waiting", "in_progress", "closed"]);

  if (examLinks && examLinks.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete questions used by a waiting, active, or closed exam" },
      { status: 400 }
    );
  }

  await supabase.from("exam_questions").delete().in("question_id", questionIds);
  await supabase.from("attempt_answers").delete().in("question_id", questionIds);

  const { error } = await supabase
    .from("questions")
    .delete()
    .in("id", questionIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedCount: questionIds.length });
}
