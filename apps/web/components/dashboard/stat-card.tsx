import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<LucideProps>;
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1.5">
          <p className="eyebrow">{label}</p>
          <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
