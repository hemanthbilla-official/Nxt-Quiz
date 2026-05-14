"use client";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function Header() {
  const router = useRouter();

  const onClickLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-border bg-card mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Nxt-Quiz</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={onClickLogout}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-danger border border-border rounded hover:border-danger/30 transition-colors duration-150"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
