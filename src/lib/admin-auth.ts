import { createClient } from "@/lib/supabase/server";
import { isSafeLocalBypassEnabled, LOCAL_ADMIN_ID } from "@/lib/environment";
import { User } from "@supabase/supabase-js";

export async function getAdminUser(): Promise<User | null> {
  const isLocal = isSafeLocalBypassEnabled();
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // LOCAL BYPASS: If no user and in local mode, return a dummy admin user
  if (!user && isLocal) {
    return {
      id: LOCAL_ADMIN_ID,
      email: "admin@local.test",
      user_metadata: { full_name: "Local Administrator" },
      aud: "authenticated",
      role: "authenticated",
      created_at: new Date().toISOString(),
      app_metadata: {},
    } as User;
  }

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}
