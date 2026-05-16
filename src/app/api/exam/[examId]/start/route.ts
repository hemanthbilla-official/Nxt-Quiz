import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { examId } = await params;
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // 1. Check if exam has questions before attempting to start
  const { count: questionCount } = await supabase
    .from("exam_questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (!questionCount || questionCount === 0) {
    return NextResponse.json(
      { error: "Cannot start an exam with no questions. Please add questions first." },
      { status: 400 },
    );
  }

  // 2. Call transactional RPC to handle the entire start lifecycle
  const { data: exam, error } = await supabase.rpc("admin_start_exam", {
    p_exam_id: examId,
    p_admin_user_id: admin.id,
  });

  if (error) {
    const isStatusError = error.message.toLowerCase().includes("waiting status");
    return NextResponse.json(
      { error: error.message },
      { status: isStatusError ? 400 : 500 },
    );
  }

  return NextResponse.json({ 
    success: true, 
    startsAt: exam.starts_at,
    closesAt: exam.closes_at 
  });
}
