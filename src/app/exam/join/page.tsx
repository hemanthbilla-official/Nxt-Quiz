"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinExam() {
  const [examCode, setExamCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
      setUserName(user.user_metadata?.full_name || "Student");
    });
  }, [router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = examCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/exam/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examCode: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join exam");
        setLoading(false);
        return;
      }

      router.push(`/exam/${data.examId}/waiting`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-col gap-3 px-4 sm:px-6 py-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">Nxt-Quiz</span>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <ThemeToggle />
          <button
            onClick={() => router.push("/scores")}
            className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded transition-colors duration-150 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
            My Scores
          </button>
          <span className="text-sm text-muted-foreground">{userName}</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs text-muted-foreground hover:text-danger transition-colors duration-150 flex items-center gap-2"
          >
            {loggingOut && <div className="spinner" style={{ width: 10, height: 10 }} />}
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Join Exam
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter the Exam ID provided by your instructor
            </p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleJoin} className="space-y-6">
              {error && (
                <div className="p-3 rounded bg-danger/10 border border-danger/20 text-danger text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="exam-code"
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  Exam Code
                </label>
                <input
                  id="exam-code"
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RCT-A7X3"
                  className="w-full px-4 py-3 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors duration-150 text-center text-lg font-mono tracking-widest"
                  required
                  autoFocus
                  maxLength={20}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !examCode.trim()}
                className="btn-primary w-full py-3 text-base shadow-sm disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner" />
                    Joining...
                  </span>
                ) : (
                  "Enter Waiting Room"
                )}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
