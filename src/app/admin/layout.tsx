"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AdminSidebar, MobileNav, MobileDrawer, CommandPalette } from "@/components/layout/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    setSidebarOpen(false);
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-200 ease-out pb-20 lg:pb-0 ${
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60"
        }`}
      >
        <main className="flex-1 p-5 lg:p-8 animate-fade-in max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <MobileNav onOpenDrawer={() => setSidebarOpen(true)} />

      <MobileDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <CommandPalette open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}