"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="card p-8 max-w-md w-full text-center animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-danger-muted flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="btn-primary w-full h-10"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
