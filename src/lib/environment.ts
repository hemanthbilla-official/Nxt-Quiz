export function isSafeLocalBypassEnabled() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENVIRONMENT === "local" &&
    (supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1"))
  );
}

export function assertLocalBypassIsNotProduction() {
  if (process.env.NODE_ENV === "production" && process.env.ENVIRONMENT === "local") {
    throw new Error("Refusing to run production with local auth bypass enabled.");
  }
}

export const LOCAL_STUDENT_ID = "00000000-0000-0000-0000-000000000001";
export const LOCAL_ADMIN_ID = "00000000-0000-0000-0000-000000000000";
