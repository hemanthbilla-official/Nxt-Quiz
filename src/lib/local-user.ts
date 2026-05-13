import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const LOCAL_STUDENT_EMAIL = "local.student@example.test";
export const LOCAL_STUDENT_COOKIE = "local_student_user_id";

export function isLocalEnvironment() {
  return (
    process.env.ENVIRONMENT === "local" ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === "local"
  );
}

export function isLocalSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    return false;
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

export function assertLocalSupabase() {
  if (!isLocalEnvironment() || !isLocalSupabaseUrl()) {
    throw new Error("Local bypass requires ENVIRONMENT=local and a localhost Supabase URL");
  }
}

export async function getLocalUserIdFromCookie() {
  if (!isLocalEnvironment()) {
    return null;
  }

  assertLocalSupabase();

  const cookieStore = await cookies();
  return cookieStore.get(LOCAL_STUDENT_COOKIE)?.value ?? null;
}

export async function resolveUserIdForLocalBypass(authUserId?: string) {
  if (authUserId) {
    return authUserId;
  }

  if (!isLocalEnvironment()) {
    return null;
  }

  return getLocalUserIdFromCookie();
}

export async function setLocalUserCookie(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(LOCAL_STUDENT_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
}

export async function findOrCreateLocalAuthUser(
  admin: SupabaseClient,
  fullName: string,
) {
  assertLocalSupabase();

  const { data: listedUsers, error: listError } =
    await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (listError) {
    throw new Error(listError.message);
  }

  const existingUser = listedUsers.users.find(
    (user) => user.email === LOCAL_STUDENT_EMAIL,
  );

  if (existingUser) {
    return existingUser;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: LOCAL_STUDENT_EMAIL,
    password: "local-student-password",
    email_confirm: true,
    user_metadata: {
      full_name: fullName || "Local Student",
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Failed to create local auth user");
  }

  return data.user;
}
