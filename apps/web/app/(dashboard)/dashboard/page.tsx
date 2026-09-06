"use client";

import Link from "next/link";
import { Clock, ListMusic, Mic2, Sparkles, TrendingUp } from "lucide-react";

import { AdSlot } from "@/components/ads/ad-slot";
import { BarChart, type BarDatum } from "@/components/charts/bar-chart";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { formatMinutes } from "@/lib/format";
import type { Job, ProjectListItem, UsageSummary, Voice } from "@/types/api";

function activityChart(jobs: Job[]): BarDatum[] {
  return jobs
    .filter((j) => j.status === "completed")
    .slice(0, 8)
    .reverse()
    .map((j) => ({
      label: j.completed_at
        ? new Date(j.completed_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })
        : "—",
      value: Math.round(((j.generation_ms ?? 0) / 1000) * 10) / 10,
    }));
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiData<{
    projects: ProjectListItem[];
    voices: Voice[];
    usage: UsageSummary | null;
    jobs: Job[];
  }>(async () => {
    const [projects, voices, usage, jobs] = await Promise.all([
      api.projects.list(),
      api.voices.list(),
      api.account.usage().catch(() => null),
      api.generation.history().catch(() => []),
    ]);
    return { projects, voices, usage, jobs };
  }, []);

  const projects = data?.projects ?? [];
  const voices = data?.voices ?? [];
  const usage = data?.usage ?? null;
  const jobs = data?.jobs ?? [];
  const voiceById = new Map(voices.map((v) => [v.id, v.name]));
  const voiceName = (id: string | null) => (id ? (voiceById.get(id) ?? "—") : "—");

  const completed = projects.filter((p) => p.status === "completed");
  const totalSeconds = projects.reduce(
    (sum, p) => sum + (p.final_duration_seconds ?? p.estimated_duration_seconds ?? 0),
    0,
  );
  const chart = activityChart(jobs);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        description="Your narration studio at a glance."
        actions={
          <div className="flex items-center gap-2">
            {usage ? <Badge variant="muted">{usage.plan.name} plan</Badge> : null}
            <Button asChild>
              <Link href="/projects/new">
                <Sparkles className="h-4 w-4" /> New Narration
              </Link>
            </Button>
          </div>
        }
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
            <StatCard label="Projects" value={String(projects.length)} icon={ListMusic} />
            <StatCard label="Voices" value={String(voices.length)} icon={Mic2} />
            <StatCard
              label="Narration Minutes"
              value={formatMinutes(totalSeconds)}
              hint="Across your projects"
              icon={Clock}
            />
            <StatCard
              label="Completed"
              value={String(completed.length)}
              hint="Projects with final audio"
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[160px]" /> : <BarChart data={chart} unit="s" />}
            <p className="mt-2 text-xs text-muted-foreground">
              Generation time (seconds) for your most recent completed narrations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan &amp; quota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-24" />
            ) : usage ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current plan</span>
                  <span className="font-medium">{usage.plan.name}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {usage.quota.characters_used.toLocaleString()} /{" "}
                      {usage.quota.characters.toLocaleString()} chars
                    </span>
                    <span>{usage.quota.percent_used}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, usage.quota.percent_used)}%` }}
                    />
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/plans">View plans</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Usage data unavailable.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {usage?.ads_enabled ? <AdSlot /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No projects yet"
              description="Create your first narration to get started."
              action={
                <Button asChild>
                  <Link href="/projects/new">New Narration</Link>
                </Button>
              }
            />
          ) : (
            <ProjectsTable projects={projects.slice(0, 6)} voiceName={voiceName} onChanged={reload} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
