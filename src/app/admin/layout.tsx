"use client";

/**
 * Admin Layout — Collapsible sidebar with polished, professional aesthetics.
 * Groups navigation into logical sections with Lucide icons.
 */

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Activity,
  PlusCircle,
  Database,
  Settings2,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Search,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setSidebarOpen(false);
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const navGroups = [
    {
      title: "Core",
      items: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      title: "Exam Management",
      items: [
        { href: "/admin/live", label: "Live Monitor", icon: Activity, exact: true },
        { href: "/admin/exams/new", label: "Create Exam", icon: PlusCircle, exact: true },
        { href: "/admin/questions", label: "Question Bank", icon: Database, exact: true },
        { href: "/admin/controls", label: "Exam Controls", icon: Settings2, exact: true },
      ],
    },
    {
      title: "People",
      items: [
        { href: "/admin/students", label: "Students", icon: Users, exact: true },
      ],
    },
  ];

  const mobileNavItems = [
    { href: "/admin", label: "Home", icon: LayoutDashboard },
    { href: "/admin/live", label: "Live", icon: Activity },
    { href: "/admin/exams/new", label: "Create", icon: PlusCircle },
    { href: "/admin/questions", label: "Bank", icon: Database },
    { href: "/admin/students", label: "Users", icon: Users },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-foreground">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-card hidden lg:flex flex-col transition-all duration-200 ease-out ${
          sidebarCollapsed ? "w-[68px]" : "w-60"
        }`}
      >
        {/* Logo / Brand */}
        <div className="h-14 flex items-center px-5 border-b border-border">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
              <span className="text-background font-bold text-xs tracking-tight">N</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold tracking-tight truncate">Nxt-Quiz</span>
                <span className="text-[10px] text-muted-foreground font-medium leading-none">
                  Admin
                </span>
              </div>
            )}
          </div>
        </div>


        {/* Navigation */}
        <nav className="flex-1 px-2.5 pt-3 pb-2 space-y-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="section-label px-2 mb-1.5">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((link) => {
                  const active = isActive(link.href, link.exact);
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
                      <Icon
                        className={`w-[18px] h-[18px] flex-shrink-0 ${
                          active ? "text-accent" : "group-hover:text-foreground"
                        }`}
                      />
                      {!sidebarCollapsed && (
                        <span className="ml-2.5 text-[13px] truncate">
                          {link.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-3 border-t border-border flex ${sidebarCollapsed ? "flex-col gap-1.5 items-center" : "items-center gap-1.5"}`}>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className={`flex items-center h-9 rounded-md text-muted-foreground hover:text-danger hover:bg-danger-muted transition-colors px-2.5 ${
              sidebarCollapsed ? "w-full justify-center" : "flex-1 gap-2"
            }`}
            title="Logout"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-[13px] font-medium">Logout</span>
            )}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-hover transition-all z-50 shadow-sm"
          aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft
            className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      </aside>

      {/* ═══ Main Content ═══ */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ease-out pb-20 lg:pb-0 ${
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60"
        }`}
      >
        <main className="flex-1 p-5 lg:p-8 animate-fade-in max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* ═══ Mobile Bottom Nav ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 z-50 lg:hidden">
        {mobileNavItems.map((item) => {
          const active = isActive(item.href, item.href === "/admin");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                active
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* ═══ Mobile Sidebar Drawer ═══ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-14 flex items-center px-5 border-b border-border justify-between">
          <span className="font-semibold text-sm">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navGroups
            .flatMap((g) => g.items)
            .map((link) => {
              const active = isActive(link.href, link.exact);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
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

      {/* ═══ Search Command Palette ═══ */}
      {isSearchOpen && (
        <div className="modal-overlay" style={{ alignItems: "flex-start", paddingTop: "15vh" }}>
          <div
            className="absolute inset-0"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="modal-content max-w-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search exams, questions, or students..."
                className="flex-1 h-8 bg-transparent border-none outline-none text-sm text-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsSearchOpen(false);
                }}
              />
              <kbd className="kbd">ESC</kbd>
            </div>
            <div className="p-6 text-center py-16">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Search results will appear here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start typing to search across the platform
              </p>
            </div>
            <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-medium">
              <div className="flex gap-4">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
              </div>
              <span>Current workspace</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
