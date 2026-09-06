"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  HelpCircle,
  Home,
  Library,
  Mic2,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/projects/new", label: "Studio", icon: Sparkles },
  { href: "/voices", label: "Voices", icon: Mic2 },
  { href: "/projects", label: "Library", icon: Library },
  { href: "/usage", label: "Usage", icon: SlidersHorizontal },
  { href: "/plans", label: "Plans", icon: CreditCard },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/projects/new") return pathname === "/projects/new";
  if (href === "/projects") {
    // Library owns the project list + open projects, but not the Studio create route.
    return pathname === "/projects" || pathname.startsWith("/projects/") ? pathname !== "/projects/new" : false;
  }
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={cn(
              "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="truncate">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
