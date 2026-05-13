import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LOCAL_STUDENT_EMAIL,
  assertLocalSupabase,
  findOrCreateLocalAuthUser,
  setLocalUserCookie,
} from "@/lib/local-user";

export async function POST(request: Request) {
  const { studentCollegeId, fullName } = await request.json();
  const isLocal = process.env.ENVIRONMENT === "local" || process.env.NEXT_PUBLIC_ENVIRONMENT === "local";

  if (!isLocal) {
    return NextResponse.json({ error: "Only allowed in local dev" }, { status: 403 });
  }

  try {
    assertLocalSupabase();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Local Supabase required" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const localUser = await findOrCreateLocalAuthUser(admin, fullName || "Local Student");

  // Upsert the local profile using a real auth.users id to satisfy profiles_id_fkey.
  const { error } = await admin.from("profiles").upsert({
    id: localUser.id,
    student_college_id: studentCollegeId,
    full_name: fullName || "Local Student",
    onboarded_at: new Date().toISOString(),
    email: localUser.email || LOCAL_STUDENT_EMAIL,
    role: "student",
    updated_at: new Date().toISOString()
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await setLocalUserCookie(localUser.id);

  return NextResponse.json({ success: true, userId: localUser.id });
}
