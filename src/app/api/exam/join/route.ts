import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocalUserIdFromCookie, isLocalEnvironment } from "@/lib/local-user";

export async function POST(request: Request) {
  const { examCode } = await request.json();

  if (!examCode) {
    return NextResponse.json({ error: "Exam code is required" }, { status: 400 });
  }

  const trimmed = examCode.trim().toUpperCase();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return NextResponse.json({ error: "Invalid exam code length" }, { status: 400 });
  }

  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return NextResponse.json({ error: "Exam code must be alphanumeric" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // BUG-01: Fix operator precedence with parentheses
  let userId: string | null = user?.id ?? null;
  const isLocal = isLocalEnvironment();
  
  if (!userId && isLocal) {
    userId = await getLocalUserIdFromCookie();
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const profileClient = isLocal ? createAdminClient() : supabase;
  const { data: profile } = await profileClient
    .from("profiles")
    .select("student_college_id, onboarded_at")
    .eq("id", userId)
    .single();

  if (!profile?.student_college_id) {
    return NextResponse.json(
      { error: "Please complete onboarding first" },
      { status: 400 }
    );
  }

  // Use admin client to execute atomic join RPC
  const admin = createAdminClient();

  const { data: examId, error } = await admin.rpc("join_exam", {
    p_exam_code: trimmed,
    p_user_id: userId,
  });

  if (error) {
    // Check specific error messages from Postgres RAISE EXCEPTION
    if (error.message.includes("Invalid exam code")) {
      return NextResponse.json({ error: "Invalid exam code" }, { status: 404 });
    }
    if (error.message.includes("removed from this exam")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message.includes("join window is closed") || error.message.includes("full capacity")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ examId });
}
