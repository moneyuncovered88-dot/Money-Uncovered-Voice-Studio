"use client";

import { BarChart3, Clock, FolderOpen, Mic2, Info } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function UsagePage() {
  const { data, loading, error, reload } = useApiData(() => api.account.usage(), []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usage"
        description="Track your characters, generated minutes, projects, and voices against your plan."
        actions={data ? <Badge variant="muted">{data.plan.name} plan</Badge> : null}
      />

      {error ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatCard
              label="Characters Used"
              value={(data?.usage.characters ?? 0).toLocaleString()}
              hint="This billing period"
              icon={BarChart3}
            />
            <StatCard
              label="Minutes Generated"
              value={String(data?.usage.minutes ?? 0)}
              hint="Final audio minutes"
              icon={Clock}
            />
            <StatCard
              label="Projects"
              value={String(data?.usage.projects ?? 0)}
              hint="Created"
              icon={FolderOpen}
            />
            <StatCard
              label="Voices"
              value={String(data?.usage.voices ?? 0)}
              hint="Active profiles"
              icon={Mic2}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly character quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-16" />
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {(data?.quota.characters_used ?? 0).toLocaleString()} /{" "}
                    {(data?.quota.characters ?? 0).toLocaleString()} characters
                  </span>
                  <span className="font-medium">{data?.quota.percent_used ?? 0}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, data?.quota.percent_used ?? 0)}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Remaining:{" "}
                  <span className="font-medium text-foreground">
                    {(data?.quota.characters_remaining ?? 0).toLocaleString()}
                  </span>
                </span>
                <span>Resets {data ? fmtDate(data.next_reset) : "—"}</span>
              </div>
            </>
          )}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Characters are counted when you generate a preview or full narration. Upgrade your plan
            on the Plans page for a higher monthly quota and priority generation.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
