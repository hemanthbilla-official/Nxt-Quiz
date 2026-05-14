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
    <div className="min-h-screen flex items-center justify-center p-4">
      <FloatingThemeToggle />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter the admin password to continue
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
                htmlFor="admin-password"
                className="block text-sm font-medium text-muted-foreground mb-2"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors duration-150"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded bg-primary text-white font-semibold transition-colors duration-150 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner" />
                  Verifying...
                </span>
              ) : (
                "Access Admin Portal"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-xs text-muted hover:text-primary transition-colors duration-150"
          >
            ← Back to Student Login
          </a>
        </div>
      </div>
    </div>
  );
}
