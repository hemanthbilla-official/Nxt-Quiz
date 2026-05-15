"use client";

import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <FloatingThemeToggle />
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mx-auto mb-4">
            <span className="text-background font-bold text-sm">N</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter the admin password to continue
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-danger text-sm animate-fade-in">
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-muted-foreground mb-1.5"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="input w-full h-10"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full h-10"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Verifying...
                </span>
              ) : (
                "Access Admin Portal"
              )}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <a
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Student Login
          </a>
        </div>
      </div>
    </div>
  );
}
