import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExamControls } from "@/lib/exam-controls";
import { resolveUserIdForLocalBypass } from "@/lib/local-user";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

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
  const controls = await getExamControls(admin);

  if (!controls.proctoringEnabled) {
    return NextResponse.json({ success: true, count: 0, disabled: true });
  }

  const { data: attempt } = await admin
    .from("attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!attempt) {
    return NextResponse.json(
      { error: "Active attempt not found for this user/exam" },
      { status: 404 },
    );
  }

  const { data, error: rpcError } = await admin.rpc("increment_tab_switch", {
    p_attempt_id: attempt.id,
  });

  if (rpcError) {
    console.warn(
      "RPC increment_tab_switch failed, using fallback:",
      rpcError.message,
    );
    try {
      const { data: currentAttempt } = await admin
        .from("attempts")
        .select("tab_switch_count")
        .eq("id", attempt.id)
        .single();

      const newCount = (currentAttempt?.tab_switch_count || 0) + 1;

      await admin
        .from("attempts")
        .update({ tab_switch_count: newCount })
        .eq("id", attempt.id);

      return NextResponse.json({
        success: true,
        count: newCount,
        fallback: true,
      });
    } catch (fallbackErr) {
      console.error(
        "Fallback increment failed:",
        fallbackErr instanceof Error ? fallbackErr.message : "Unknown",
      );
      return NextResponse.json({
        success: true,
        count: 0,
        error: "Proctoring log failed",
      });
    }
  }

  return NextResponse.json({ success: true, count: data });
}
