"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS } from "./navConfig";
import { X, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-out lg:hidden ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-14 flex items-center px-5 border-b border-border justify-between">
        <span className="font-semibold text-sm">Menu</span>
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {ADMIN_NAV_GROUPS
          .flatMap((g) => g.items)
          .map((link) => {
            const active = isActive(link.href, link.exact);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[13px]">{link.label}</span>
              </Link>
            );
          })}
      </nav>
      <div className="p-3 border-t border-border flex items-center gap-1.5">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-danger hover:bg-danger-muted transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="text-[13px] font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}