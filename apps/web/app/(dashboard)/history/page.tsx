"use client";

import Link from "next/link";
import { History } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import type { Job, ProjectListItem, Voice } from "@/types/api";

export default function HistoryPage() {
  const { data, loading, error, reload } = useApiData<{
    jobs: Job[];
    projects: ProjectListItem[];
    voices: Voice[];
  }>(async () => {
    const [jobs, projects, voices] = await Promise.all([
      api.generation.history(),
      api.projects.list(),
      api.voices.list(),
    ]);
    return { jobs, projects, voices };
  }, []);

  const jobs = data?.jobs ?? [];
  const projectById = new Map((data?.projects ?? []).map((p) => [p.id, p]));
  const voiceById = new Map((data?.voices ?? []).map((v) => [v.id, v.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generation History"
        description="Every narration generation — date, voice, duration, and estimated compute cost."
      />

      <Card>
        <CardContent className="p-0 sm:p-2">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-4 p-5">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={reload}>
                Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              className="m-4"
              icon={History}
              title="No generations yet"
              description="Run a narration and it'll show up here with its status, duration, and cost."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Gen time</TableHead>
                  <TableHead className="text-right">Est. cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const project = projectById.get(job.project_id);
                  const voiceName = project?.voice_profile_id
                    ? (voiceById.get(project.voice_profile_id) ?? "—")
                    : "—";
                  const genSeconds = job.generation_ms ? job.generation_ms / 1000 : null;
                  const cost = job.estimated_cost ?? 0;
                  return (
                    <TableRow key={job.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(job.created_at)}
                      </TableCell>
                      <TableCell>
                        {project ? (
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {project.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">(deleted)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{voiceName}</TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {project?.final_duration_seconds
                          ? formatDuration(project.final_duration_seconds)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {genSeconds ? `${genSeconds.toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {cost > 0 ? `$${cost.toFixed(4)}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Cost is an estimate: generation seconds ÷ 3600 × the GPU rate you set
        (<code>GPU_COST_PER_HOUR</code>). It shows a dash until that rate is configured.
      </p>
    </div>
  );
}
