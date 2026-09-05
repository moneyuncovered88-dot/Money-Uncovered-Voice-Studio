"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookA,
  History,
  LayoutDashboard,
  ListMusic,
  Mic2,
  Settings,
  SquarePen,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: ListMusic },
  { href: "/projects/new", label: "New Narration", icon: SquarePen },
  { href: "/voices", label: "Voices", icon: Mic2 },
  { href: "/pronunciations", label: "Pronunciation Dictionary", icon: BookA },
  { href: "/history", label: "Generation History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/projects"
            ? pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new")
            : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
