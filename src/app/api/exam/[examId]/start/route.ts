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
  const { data: exam, error } = await supabase.rpc("admin_start_exam", {
    p_exam_id: examId,
    p_admin_user_id: admin.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, startsAt: exam.starts_at });
}
