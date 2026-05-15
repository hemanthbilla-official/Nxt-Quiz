"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, LogOut, Loader2, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
            <span className="text-background font-bold text-[10px]">N</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Nxt-Quiz
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => router.push("/scores")}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Scores
          </button>
          <div className="w-px h-4 bg-border hidden sm:block" />
          <span className="text-xs font-medium text-foreground hidden sm:inline">
            {userName}
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "..." : "Sign Out"}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[800px] animate-fade-in border border-border rounded-xl bg-background shadow-sm overflow-hidden flex flex-col md:flex-row">
          {/* Left Side: Branding / Framing */}
          <div className="md:w-5/12 bg-muted/20 p-8 md:p-12 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Join Assessment
              </h1>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Enter the unique access code provided by your instructor to
                enter the secure waiting room.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Proctored Session
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
            <form onSubmit={handleJoin} className="space-y-6 max-w-sm">
              {error && (
                <div className="p-3 rounded-md bg-danger-muted border border-danger/20 text-danger text-xs font-medium flex items-center gap-2 animate-fade-in">
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="exam-code"
                  className="block text-sm font-medium text-foreground"
                >
                  Access Code
                </label>
                <input
                  id="exam-code"
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RCT-A7X3"
                  className="w-full h-11 bg-background border border-border rounded-md text-foreground font-mono text-base outline-none transition-colors focus:border-foreground hover:border-border-hover placeholder:text-muted-foreground/40 shadow-sm px-3 tracking-widest uppercase"
                  required
                  autoFocus
                  maxLength={20}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !examCode.trim()}
                className="w-full h-10 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-4 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Enter Waiting Room
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
