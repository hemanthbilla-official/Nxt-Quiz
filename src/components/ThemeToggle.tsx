"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-md border border-border bg-transparent" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-8 h-8 p-0 rounded-md border border-transparent bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border flex items-center justify-center transition-all duration-150"
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4">
        <Sun className={`absolute inset-0 h-4 w-4 transition-all duration-200 ${
          resolvedTheme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        }`} aria-hidden="true" />
        <Moon className={`absolute inset-0 h-4 w-4 transition-all duration-200 ${
          resolvedTheme === "dark" ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`} aria-hidden="true" />
      </div>
    </button>
  );
}

