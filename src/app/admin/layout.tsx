"use client";

/**
 * REDESIGN SUMMARY:
 * - Implemented collapsible LEFT SIDEBAR with premium aesthetics.
 * - Grouped navigation into logical sections (Management, People).
 * - Switched to Lucide icons for consistency.
 * - Active state now uses background tint + 4px bold left border.
 * - Added a search placeholder for Cmd+K functionality.
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
  Command,
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

  // Global shortcut for search
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

  // Close mobile sidebar on route change
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
        {
          href: "/admin/live",
          label: "Live Monitor",
          icon: Activity,
          exact: true,
        },
        {
          href: "/admin/exams/new",
          label: "Create Exam",
          icon: PlusCircle,
          exact: true,
        },
        {
          href: "/admin/questions",
          label: "Question Bank",
          icon: Database,
          exact: true,
        },
        {
          href: "/admin/controls",
          label: "Exam Controls",
          icon: Settings2,
          exact: true,
        },
      ],
    },
    {
      title: "People",
      items: [
        {
          href: "/admin/students",
          label: "Students",
          icon: Users,
          exact: true,
        },
      ],
    },
  ];

  // Mobile Bottom Nav Items (max 6)
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
          className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-card hidden lg:flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 border-b border-border mb-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate">Nxt-Quiz</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Admin Portal
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-8 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((link) => {
                  const active = isActive(link.href, link.exact);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center group relative h-10 px-3 rounded-md transition-all duration-200 ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
                      }`}
                    >
                      {/* Active Indicator Border */}
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
                      )}

                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary" : "group-hover:text-foreground"}`}
                      />

                      {!sidebarCollapsed && (
                        <span className="ml-3 text-sm font-medium truncate">
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

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-border flex ${sidebarCollapsed ? "flex-col space-y-2 items-center" : "items-center gap-2"}`}>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className={`flex items-center h-10 rounded-md text-danger hover:bg-danger/10 transition-colors px-3 ${
              sidebarCollapsed ? "w-full justify-center" : "flex-1 gap-3"
            }`}
            title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        </div>

        {/* Centered Sidebar Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-all z-50 shadow-sm"
          aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft
            className={`w-3 h-3 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out pb-20 lg:pb-0 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 animate-fade-in max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50 lg:hidden">
        {mobileNavItems.map((item) => {
          const active = isActive(item.href, item.href === "/admin");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* Mobile Sidebar (Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <span className="font-bold">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navGroups
            .flatMap((g) => g.items)
            .map((link) => {
              const active = isActive(link.href, link.exact);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-card-hover"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
        </nav>
        <div className="p-4 border-t border-border flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-3 p-3 rounded-md text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl animate-fade-in overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder="Search exams, questions, or students..."
                className="flex-1 h-10 bg-transparent border-none outline-none px-3 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsSearchOpen(false);
                }}
              />
              <div className="px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground font-medium">
                ESC
              </div>
            </div>
            <div className="p-4 text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Search results will appear here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start typing to see results across the platform
              </p>
            </div>
            <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              <div className="flex gap-4">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
              </div>
              <span>Results from current workspace</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
