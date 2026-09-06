"use client";

import Link from "next/link";
import { useState } from "react";
import { Library, Search, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ProjectListItem, Voice } from "@/types/api";

const PROCESSING = new Set([
  "queued",
  "preprocessing",
  "generating",
  "assembling",
  "normalizing",
  "uploading",
]);

type Tab = "all" | "drafts" | "processing" | "completed" | "failed";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "drafts", label: "Drafts" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

function matchesTab(status: string, tab: Tab): boolean {
  switch (tab) {
    case "drafts":
      return status === "draft";
    case "processing":
      return PROCESSING.has(status);
    case "completed":
      return status === "completed";
    case "failed":
      return status === "failed" || status === "cancelled";
    default:
      return true;
  }
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const { data, loading, error, reload } = useApiData<{
    projects: ProjectListItem[];
    voices: Voice[];
  }>(async () => {
    const [projects, voices] = await Promise.all([api.projects.list(), api.voices.list()]);
    return { projects, voices };
  }, []);

  const allProjects = data?.projects ?? [];
  const voices = data?.voices ?? [];
  const voiceById = new Map(voices.map((v) => [v.id, v.name]));
  const voiceName = (id: string | null) => (id ? (voiceById.get(id) ?? "—") : "—");

  const q = query.trim().toLowerCase();
  const projects = allProjects.filter(
    (p) =>
      matchesTab(p.status, tab) &&
      (q === "" ||
        p.title.toLowerCase().includes(q) ||
        (p.video_title ?? "").toLowerCase().includes(q)),
  );

  const countFor = (t: Tab) => allProjects.filter((p) => matchesTab(p.status, t)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Every narration project, output, and draft in one place."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Sparkles className="h-4 w-4" /> New Narration
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <span className="ml-1.5 text-xs opacity-70">{countFor(t.key)}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="pl-8"
          />
        </div>
      </div>

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
              icon={Library}
              title={allProjects.length === 0 ? "No projects yet" : "Nothing here"}
              description={
                allProjects.length === 0
                  ? "Paste a script and generate your first narration."
                  : "No projects match this filter."
              }
              action={
                allProjects.length === 0 ? (
                  <Button asChild>
                    <Link href="/projects/new">New Narration</Link>
                  </Button>
                ) : undefined
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
