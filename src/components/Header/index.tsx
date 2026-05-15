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
    <header className="sticky top-0 z-50 glass border-b border-border/50 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Nxt-Quiz
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onClickLogout}
            className="btn-ghost hover:text-danger hover:bg-danger/5 text-xs"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
