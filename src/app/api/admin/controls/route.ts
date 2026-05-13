import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_EXAM_CONTROLS,
  EXAM_CONTROLS_KEY,
  normalizeExamControls,
} from "@/lib/exam-controls";
import { assertSameOriginRequest } from "@/lib/request-security";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_controls")
    .select("value, updated_at")
    .eq("key", EXAM_CONTROLS_KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      controls: DEFAULT_EXAM_CONTROLS,
      setupRequired: true,
      error: error.message,
    });
  }

  return NextResponse.json({
    controls: normalizeExamControls(data?.value),
    updatedAt: data?.updated_at ?? null,
    setupRequired: false,
  });
}

export async function PUT(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const controls = normalizeExamControls(body.controls);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("app_controls")
    .upsert(
      {
        key: EXAM_CONTROLS_KEY,
        value: controls,
        updated_at: new Date().toISOString(),
        updated_by: admin.id,
      },
      { onConflict: "key" },
    )
    .select("value, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    controls: normalizeExamControls(data.value),
    updatedAt: data.updated_at,
  });
}
