"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS, type NavItem } from "./navConfig";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChevronLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-card hidden lg:flex flex-col transition-all duration-200 ease-out ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      <div className="h-14 flex items-center px-5 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
            <span className="text-background font-bold text-xs tracking-tight">N</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold tracking-tight truncate">Nxt-Quiz</span>
              <span className="text-[10px] text-muted-foreground font-medium leading-none">Admin</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2.5 pt-3 pb-2 space-y-6 overflow-y-auto custom-scrollbar">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && <p className="section-label px-2 mb-1.5">{group.title}</p>}
            <div className="space-y-0.5">
              {group.items.map((link) => {
                const active = isActive(link.href, link.exact || false);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center relative h-9 px-2.5 rounded-md transition-all duration-150 group ${
                      active
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r-full" />
                    )}
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-accent" : "group-hover:text-foreground"}`} />
                    {!collapsed && <span className="ml-2.5 text-[13px] truncate">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`p-3 border-t border-border flex ${collapsed ? "flex-col gap-1.5 items-center" : "items-center gap-1.5"}`}>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className={`flex items-center h-9 rounded-md text-muted-foreground hover:text-danger hover:bg-danger-muted transition-colors px-2.5 ${
            collapsed ? "w-full justify-center" : "flex-1 gap-2"
          }`}
          title="Logout"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>

      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-hover transition-all z-50 shadow-sm"
        aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}