"use client";

import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isValidStudentId, STUDENT_ID_ERROR, STUDENT_ID_EXAMPLE, normalizeStudentId, STUDENT_ID_PREFIX } from "@/lib/student-id";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <FloatingThemeToggle />
      <div className="w-full max-w-[800px] animate-fade-in border border-border rounded-xl bg-background shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branding / Framing */}
        <div className="md:w-5/12 bg-muted/20 p-8 md:p-12 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mb-6">
              <span className="text-background font-bold text-sm">N</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome aboard,
              <br />
              <span className="text-muted-foreground">{userName}</span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              To proceed to the assessment platform, please link your official student credentials.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Secure System</div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
            {error && (
              <div className="p-3 rounded-md bg-danger-muted border border-danger/20 text-danger text-xs font-medium flex items-center gap-2 animate-fade-in">
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="college-id"
                className="block text-sm font-medium text-foreground"
              >
                Student College ID
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm select-none pointer-events-none">
                  {STUDENT_ID_PREFIX}
                </span>
                <input
                  id="college-id"
                  type="text"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                  placeholder={STUDENT_ID_EXAMPLE}
                  className="w-full h-11 bg-background border border-border rounded-md text-foreground font-mono text-base outline-none transition-colors focus:border-foreground hover:border-border-hover placeholder:text-muted-foreground/40 shadow-sm"
                  style={{ paddingLeft: "4rem", paddingRight: "1rem" }}
                  required
                  autoFocus
                  maxLength={5}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                The prefix <strong>{STUDENT_ID_PREFIX}</strong> is added automatically.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || collegeId.trim().length < 1}
              className="w-full h-10 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
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
