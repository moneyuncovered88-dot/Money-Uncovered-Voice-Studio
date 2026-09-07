"use client";

import { useState } from "react";
import { Activity, DollarSign, ShieldAlert, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api, ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdminJob, AdminOverview, AdminUser, FeatureFlag, SupportTicket } from "@/types/api";

type Tab = "overview" | "jobs" | "users" | "tickets" | "flags";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "jobs", label: "Jobs" },
  { key: "users", label: "Users" },
  { key: "tickets", label: "Tickets" },
  { key: "flags", label: "Flags" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const { data, loading, error, reload } = useApiData<{
    isAdmin: boolean;
    overview: AdminOverview | null;
    jobs: AdminJob[];
    users: AdminUser[];
    tickets: SupportTicket[];
    flags: FeatureFlag[];
  }>(async () => {
    const me = await api.account.me();
    if (!me.is_admin) {
      return { isAdmin: false, overview: null, jobs: [], users: [], tickets: [], flags: [] };
    }
    const [overview, jobs, users, tickets, flags] = await Promise.all([
      api.admin.overview(),
      api.admin.jobs(),
      api.admin.users(),
      api.admin.tickets(),
      api.admin.featureFlags(),
    ]);
    return { isAdmin: true, overview, jobs, users, tickets, flags };
  }, []);

  async function toggleFlag(key: string, enabled: boolean) {
    try {
      await api.admin.setFlag(key, enabled);
      toast.success("Flag updated");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not update flag");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin" description="Platform operations and controls." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      </div>
    );
  }

  if (data && !data.isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin" />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <p className="font-medium">Access denied</p>
            <p className="text-sm text-muted-foreground">
              Your account is not an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const o = data?.overview;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Platform operations, usage, and controls."
        actions={
          <Button variant="outline" size="sm" onClick={reload}>
            Refresh
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && o ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Plan distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(o.plan_distribution).length === 0 ? (
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
              <CardContent className="space-y-2 text-sm">
                <Row label="Completed jobs" value={o.jobs.completed} />
                <Row label="Projects" value={o.content.projects} />
                <Row label="Voices" value={o.content.voices} />
                <Row label="Open tickets" value={o.open_tickets} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "jobs" ? (
        <AdminTable
          head={["Status", "Chunks", "GPU s", "Cost", "Created"]}
          rows={(data?.jobs ?? []).map((j) => [
            <Badge key="s" variant={j.status === "failed" ? "destructive" : "muted"}>
              {j.status}
            </Badge>,
            String(j.total_chunks ?? "—"),
            String(j.gpu_seconds ?? "—"),
            j.estimated_cost != null ? `$${j.estimated_cost}` : "—",
            fmt(j.created_at),
          ])}
          empty="No jobs yet."
        />
      ) : null}

      {tab === "users" ? (
        <AdminTable
          head={["Email", "Plan", "Joined", "Last sign-in"]}
          rows={(data?.users ?? []).map((u) => [
            u.email ?? "—",
            <span key="p" className="capitalize">
              {u.plan}
            </span>,
            fmt(u.created_at),
            fmt(u.last_sign_in_at || null),
          ])}
          empty="No users found (check the service role key)."
        />
      ) : null}

      {tab === "tickets" ? (
        <AdminTable
          head={["Topic", "Message", "Status", "Created"]}
          rows={(data?.tickets ?? []).map((t) => [
            t.topic ?? "—",
            <span key="m" className="line-clamp-1 max-w-[360px]">
              {t.message}
            </span>,
            <Badge key="s" variant="muted">
              {t.status}
            </Badge>,
            fmt(t.created_at),
          ])}
          empty={
            <span className="inline-flex items-center gap-2">
              <TicketIcon className="h-4 w-4" /> No support tickets.
            </span>
          }
        />
      ) : null}

      {tab === "flags" ? (
        <Card>
          <CardHeader>
            <CardTitle>Feature flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.flags ?? []).map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.key}</p>
                </div>
                <Button
                  size="sm"
                  variant={f.enabled ? "default" : "outline"}
                  onClick={() => toggleFlag(f.key, !f.enabled)}
                >
                  {f.enabled ? "On" : "Off"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function AdminTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  {head.map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cells, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    {cells.map((c, j) => (
                      <td key={j} className="px-4 py-3">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
