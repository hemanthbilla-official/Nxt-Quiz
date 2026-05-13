import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LOCAL_STUDENT_EMAIL,
  LOCAL_STUDENT_ID,
  assertLocalSupabase,
  findOrCreateLocalAuthUser,
  setLocalUserCookie,
} from "@/lib/local-user";
import { assertSameOriginRequest } from "@/lib/request-security";
import { isValidStudentId, normalizeStudentId } from "@/lib/student-id";

export async function POST(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { studentCollegeId, fullName } = await request.json();

  try {
    assertLocalSupabase();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Local Supabase required" },
      { status: 403 },
    );
  }

  const normalizedStudentId = normalizeStudentId(String(studentCollegeId ?? ""));
  if (!isValidStudentId(normalizedStudentId)) {
    return NextResponse.json({ error: "Invalid student college ID format" }, { status: 400 });
  }

  const admin = createAdminClient();
  const localUser = await findOrCreateLocalAuthUser(admin, fullName || "Local Student");

  const { error } = await admin.from("profiles").upsert({
    id: localUser.id,
    student_college_id: normalizedStudentId,
    full_name: typeof fullName === "string" && fullName.trim() ? fullName.trim() : "Local Student",
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
