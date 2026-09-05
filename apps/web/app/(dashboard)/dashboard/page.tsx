"use client";

import Link from "next/link";
import { Clock, ListMusic, Mic2, SquarePen, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { formatMinutes } from "@/lib/format";
import type { ProjectListItem, Voice } from "@/types/api";

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiData<{
    projects: ProjectListItem[];
    voices: Voice[];
  }>(async () => {
    const [projects, voices] = await Promise.all([api.projects.list(), api.voices.list()]);
    return { projects, voices };
  }, []);

  const projects = data?.projects ?? [];
  const voices = data?.voices ?? [];
  const voiceById = new Map(voices.map((v) => [v.id, v.name]));
  const voiceName = (id: string | null) => (id ? (voiceById.get(id) ?? "—") : "—");

  const completed = projects.filter((p) => p.status === "completed");
  const totalSeconds = projects.reduce(
    (sum, p) => sum + (p.final_duration_seconds ?? p.estimated_duration_seconds ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your narration studio at a glance."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <SquarePen className="h-4 w-4" /> New Narration
            </Link>
          </Button>
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
              hint="Estimated until generation completes"
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
              icon={SquarePen}
              title="No projects yet"
              description="Create your first narration to get started."
              action={
                <Button asChild>
                  <Link href="/projects/new">New Narration</Link>
                </Button>
              }
            />
          ) : (
            <ProjectsTable
              projects={projects.slice(0, 6)}
              voiceName={voiceName}
              onChanged={reload}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
