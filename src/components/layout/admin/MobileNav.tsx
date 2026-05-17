"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_ITEMS } from "./navConfig";
import { Menu } from "lucide-react";

interface MobileNavProps {
  onOpenDrawer: () => void;
}

export function MobileNav({ onOpenDrawer }: MobileNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 z-50 lg:hidden">
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
              active ? "text-accent" : "text-muted-foreground"
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
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium">More</span>
      </button>
    </nav>
  );
}