"use client";

import Link from "next/link";
import { ListMusic, SquarePen } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import type { ProjectListItem, Voice } from "@/types/api";

export default function ProjectsPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Every narration project you've created."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <SquarePen className="h-4 w-4" /> New Narration
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0 sm:p-2">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-4 p-5">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={reload}>
                Retry
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              className="m-4"
              icon={ListMusic}
              title="No projects yet"
              description="Paste a Money Uncovered script and generate your first narration."
              action={
                <Button asChild>
                  <Link href="/projects/new">New Narration</Link>
                </Button>
              }
            />
          ) : (
            <ProjectsTable projects={projects} voiceName={voiceName} onChanged={reload} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
