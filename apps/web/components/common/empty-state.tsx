import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      {/* Soft focal glow — subtle, not a flat gray block. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-8 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl"
      />
      {Icon ? (
        <div className="relative mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/20">
            <Icon className="h-6 w-6" />
          </div>
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold/80" />
        </div>
      ) : null}
      <h3 className="relative text-base font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="relative mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="relative mt-6">{action}</div> : null}
    </div>
  );
}
