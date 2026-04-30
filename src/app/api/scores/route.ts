import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeLocalBypassEnabled, LOCAL_STUDENT_ID } from "@/lib/environment";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId = user?.id;
  const isLocal = isSafeLocalBypassEnabled();
  
  if (!userId && isLocal) {
    userId = LOCAL_STUDENT_ID;
  }

  if (!userId) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: attempts } = await admin
    .from("attempts")
    .select(`
      exam_id,
      total_score,
      max_score,
      submitted_at,
      exams (
        title
      )
    `)
    .eq("user_id", userId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  return NextResponse.json({
    attempts: attempts || [],
    userName: user?.user_metadata?.full_name || (isLocal ? "Local Student" : "Student"),
  });
}
