"use client";

import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isValidStudentId, STUDENT_ID_ERROR, STUDENT_ID_EXAMPLE, normalizeStudentId, STUDENT_ID_PREFIX } from "@/lib/student-id";

export default function Onboarding() {
  const [collegeId, setCollegeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        if (process.env.NEXT_PUBLIC_ENVIRONMENT === "local") {
          setUserName("Local Student");
          return;
        }
        router.push("/login");
        return;
      }
      setUserName(user.user_metadata?.full_name || user.email || "Student");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = normalizeStudentId(collegeId);

    if (!isValidStudentId(trimmed)) {
      setError(STUDENT_ID_ERROR);
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = user?.id;

    let rpcError;

    if (!targetUserId && (process.env.NEXT_PUBLIC_ENVIRONMENT === "local")) {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCollegeId: trimmed,
          fullName: userName
        })
      });
      if (!res.ok) {
        const data = await res.json();
        rpcError = { message: data.error || "Failed to complete onboarding" };
      }
    } else {
      const { error } = await supabase.rpc("complete_onboarding", {
        p_student_college_id: trimmed,
      });
      rpcError = error;
    }

    if (rpcError) {
      if (rpcError.message.includes("duplicate") || rpcError.message.includes("unique")) {
        setError("This College ID is already registered by another student");
      } else {
        setError(rpcError.message);
      }
      setLoading(false);
      return;
    }

    router.push("/exam/join");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FloatingThemeToggle />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome, {userName}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter your Student College ID to complete registration
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded bg-danger/10 border border-danger/20 text-danger text-sm animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="college-id"
                className="block text-sm font-medium text-muted-foreground mb-2"
              >
                Student College ID
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-mono text-lg select-none">
                  {STUDENT_ID_PREFIX}
                </span>
                <input
                  id="college-id"
                  type="text"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                  placeholder={STUDENT_ID_EXAMPLE}
                  className="w-full pl-24 pr-4 py-3 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors duration-150 font-mono text-lg"
                  required
                  autoFocus
                  maxLength={5}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                This ID uniquely identifies you. The prefix <strong>{STUDENT_ID_PREFIX}</strong> is already added.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || collegeId.trim().length < 1}
              className="btn-primary w-full py-3 text-base shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner" />
                  Saving...
                </span>
              ) : (
                "Complete Registration"
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
