import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 5;

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Use the optimized database function instead of multiple queries
  const { data: exams, error } = await supabase
    .rpc('get_live_exam_stats');

  if (error) {
    console.error('Live stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exams: exams || [] });
}
