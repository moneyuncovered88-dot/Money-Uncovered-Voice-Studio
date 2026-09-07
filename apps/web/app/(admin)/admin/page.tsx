"use client";

import { Activity, DollarSign, FolderOpen, Mic2, Ticket } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: o, loading } = useApiData(() => api.admin.overview(), []);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Platform operations, usage, and cost." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !o ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatCard label="Active Jobs" value={String(o.jobs.active)} icon={Activity} />
            <StatCard label="Failed Today" value={String(o.jobs.failed_today)} icon={Activity} />
            <StatCard
              label="GPU Cost (est.)"
              value={`$${o.jobs.estimated_cost.toFixed(2)}`}
              hint={`${o.jobs.gpu_seconds}s total`}
              icon={DollarSign}
            />
            <StatCard
              label="MRR (est.)"
              value={`$${o.monthly_revenue_estimate}`}
              hint="From active subscriptions"
              icon={DollarSign}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading || !o ? (
              <Skeleton className="h-16" />
            ) : Object.keys(o.plan_distribution).length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid subscriptions yet.</p>
            ) : (
              Object.entries(o.plan_distribution).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{plan}</span>
                  <Badge variant="muted">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading || !o ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                <Row label="Completed jobs" value={o.jobs.completed} />
                <Row label="Projects" value={o.content.projects} />
                <Row label="Voices" value={o.content.voices} />
                <Row label="Open tickets" value={o.open_tickets} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Projects" value={o ? String(o.content.projects) : "—"} icon={FolderOpen} />
        <StatCard label="Voices" value={o ? String(o.content.voices) : "—"} icon={Mic2} />
        <StatCard label="Open Tickets" value={o ? String(o.open_tickets) : "—"} icon={Ticket} />
      </div>
    </div>
  );
}
