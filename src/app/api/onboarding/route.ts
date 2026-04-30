import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeLocalBypassEnabled, LOCAL_STUDENT_ID } from "@/lib/environment";
import { assertSameOriginRequest } from "@/lib/request-security";
import { isValidStudentId, normalizeStudentId } from "@/lib/student-id";

export async function POST(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const { studentCollegeId, fullName } = await request.json();
  const isLocal = isSafeLocalBypassEnabled();

  if (!isLocal) {
    return NextResponse.json({ error: "Only allowed in local dev" }, { status: 403 });
  }

  const normalizedStudentId = normalizeStudentId(String(studentCollegeId ?? ""));
  if (!isValidStudentId(normalizedStudentId)) {
    return NextResponse.json({ error: "Invalid student college ID format" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert the dummy profile with all required fields
  const { error } = await admin.from("profiles").upsert({
    id: LOCAL_STUDENT_ID,
    student_college_id: normalizedStudentId,
    full_name: typeof fullName === "string" && fullName.trim() ? fullName.trim() : "Local Student",
    onboarded_at: new Date().toISOString(),
    email: "local@student.com", // Required field
    role: "student",
    updated_at: new Date().toISOString()
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
