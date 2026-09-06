import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      aria-label="MUS Voices home"
      className={cn("flex items-center gap-2.5", className)}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
        <span className="h-3 w-3 rounded-sm bg-primary" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold" />
      </span>
      {!collapsed ? (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">MUS Voices</span>
          <span className="text-[11px] text-muted-foreground">Money Uncovered</span>
        </span>
      ) : null}
    </Link>
  );
}
