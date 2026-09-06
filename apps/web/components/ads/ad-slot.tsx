"use client";

/**
 * Tasteful ad placeholder shown only to free users. Real Google AdSense is
 * dropped in here later without touching call sites — keep it out of the
 * active Studio editor per the product rules.
 */
export function AdSlot({ label = "Sponsored", className = "" }: { label?: string; className?: string }) {
  return (
    <div
      className={`flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground ${className}`}
      aria-label="advertisement"
    >
      <div className="text-center">
        <div className="font-medium uppercase tracking-wide">{label}</div>
        <div className="mt-1 opacity-70">Upgrade to remove ads</div>
      </div>
    </div>
  );
}
