"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Check, Loader2, ListChecks, Play, Zap } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApiData } from "@/hooks/use-api-data";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { api, ApiRequestError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { Preset, Project, Voice } from "@/types/api";

const NO_VOICE = "none";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const { data, loading, error } = useApiData<{
    project: Project;
    voices: Voice[];
    presets: Preset[];
  }>(async () => {
    const [project, voices, presets] = await Promise.all([
      api.projects.get(projectId),
      api.voices.list(),
      api.config.presets(),
    ]);
    return { project, voices, presets };
  }, [projectId]);

  const [script, setScript] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [project, setProject] = useState<Project | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (data?.project && !seeded.current) {
      setProject(data.project);
      setScript(data.project.script_original ?? "");
      seeded.current = true;
    }
  }, [data]);

  async function patch(body: Record<string, unknown>, opts: { silent?: boolean } = {}) {
    setSaveState("saving");
    try {
      const updated = await api.projects.update(projectId, body);
      setProject(updated);
      setSaveState("saved");
      if (!opts.silent) toast.success("Saved");
    } catch (e) {
      setSaveState("error");
      toast.error(e instanceof ApiRequestError ? e.message : "Save failed");
    }
  }

  const autosaveScript = useDebouncedCallback((value: string) => {
    patch({ script_original: value }, { silent: true });
  }, 900);

  function onScriptChange(value: string) {
    setScript(value);
    setSaveState("saving");
    autosaveScript(value);
  }

  async function remove() {
    try {
      await api.projects.remove(projectId);
      toast.success("Project deleted");
      router.push("/projects");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not delete");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[420px] lg:col-span-2" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <EmptyState
        title="Project not found"
        description={error ?? "This project may have been deleted."}
        action={
          <Button variant="outline" onClick={() => router.push("/projects")}>
            Back to projects
          </Button>
        }
      />
    );
  }

  const voices = data?.voices ?? [];
  const presets = data?.presets ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.title}
        description={project.video_title ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} />
            <ConfirmDialog
              trigger={<Button variant="outline">Delete</Button>}
              title="Delete project?"
              description="This permanently removes the project and its script."
              confirmLabel="Delete"
              destructive
              onConfirm={remove}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={project.status} />
        <span className="text-sm text-muted-foreground">{project.word_count} words</span>
        <span className="text-sm text-muted-foreground">
          ~{formatDuration(project.estimated_duration_seconds)} estimated
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Script</CardTitle>
              <span className="text-xs text-muted-foreground">Autosaves as you type</span>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[420px] font-mono text-sm leading-relaxed"
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                placeholder="Paste your narration script…"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chunks</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={ListChecks}
                title="No chunks yet"
                description="Generate the narration to split the script into chunks you can preview and regenerate individually."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final narration</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={AudioLines}
                title="No audio yet"
                description="Once generation completes, the assembled narration plays here with MP3 / WAV export."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-2 text-sm">
                <Row label="Voice" value={voices.find((v) => v.id === project.voice_profile_id)?.name ?? "None selected"} />
                <Row label="Words" value={project.word_count.toLocaleString()} />
                <Row label="Est. duration" value={`~${formatDuration(project.estimated_duration_seconds)}`} />
              </dl>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" disabled title="Available after Phase 4 (TTS worker)">
                  <Play className="h-4 w-4" /> Preview
                </Button>
                <Button variant="gold" disabled title="Available after Phase 4 (TTS worker)">
                  <Zap className="h-4 w-4" /> Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generation connects to the RunPod GPU worker in a later phase.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project name</Label>
                <Input
                  id="title"
                  defaultValue={project.title}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== project.title) {
                      patch({ title: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoTitle">Video title</Label>
                <Input
                  id="videoTitle"
                  defaultValue={project.video_title ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (project.video_title ?? "")) {
                      patch({ video_title: e.target.value || null });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={project.voice_profile_id ?? NO_VOICE}
                  onValueChange={(v) => patch({ voice_profile_id: v === NO_VOICE ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VOICE}>No voice</SelectItem>
                    {voices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Narration style</Label>
                <Select
                  value={project.narration_preset}
                  onValueChange={(v) => patch({ narration_preset: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="speak">Speak section headings</Label>
                <Switch
                  id="speak"
                  checked={project.speak_headings}
                  onCheckedChange={(checked) => patch({ speak_headings: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-primary">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  }
  if (state === "error") {
    return <span className="text-xs text-destructive">Save failed</span>;
  }
  return null;
}
