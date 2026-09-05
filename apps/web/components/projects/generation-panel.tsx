"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ListChecks, Loader2, Play, RefreshCw, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiRequestError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { AudioUrls, Chunk, GenerationStatusResponse, Project } from "@/types/api";
import type { ChunkStatus } from "@/types/domain";

const ACTIVE = new Set([
  "queued",
  "preprocessing",
  "generating",
  "assembling",
  "normalizing",
  "uploading",
]);

function chunkBadge(status: ChunkStatus) {
  switch (status) {
    case "generated":
      return <Badge variant="default">generated</Badge>;
    case "failed":
      return <Badge variant="destructive">failed</Badge>;
    case "generating":
    case "queued":
      return <Badge variant="gold">{status}</Badge>;
    default:
      return <Badge variant="muted">waiting</Badge>;
  }
}

async function playUrl(url: string) {
  await new Audio(url).play();
}

export function GenerationPanel({
  projectId,
  onProjectChange,
}: {
  projectId: string;
  onProjectChange?: (p: Project) => void;
}) {
  const [status, setStatus] = useState<GenerationStatusResponse | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [audio, setAudio] = useState<AudioUrls | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "generate" | "assemble">(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.generation.status(projectId),
        api.generation.chunks(projectId),
      ]);
      setStatus(s);
      setChunks(c);
      if (s.job?.status === "completed") {
        try {
          setAudio(await api.generation.audio(projectId));
        } catch {
          // no final audio yet
        }
      }
      loadedOnce.current = true;
    } catch {
      // transient; polling will retry
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const job = status?.job ?? null;
  const active = Boolean(job && ACTIVE.has(job.status));

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      load();
    }, 2500);
    return () => clearInterval(timer);
  }, [active, load]);

  async function onPreview() {
    setBusy("preview");
    try {
      const res = await api.generation.preview(projectId);
      await playUrl(res.url);
      toast.success("Preview ready");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Preview failed");
    } finally {
      setBusy(null);
    }
  }

  async function onGenerate() {
    setBusy("generate");
    try {
      await api.generation.generate(projectId);
      toast.success("Generation started");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not start generation");
    } finally {
      setBusy(null);
    }
  }

  async function onRebuild() {
    setBusy("assemble");
    try {
      const p = await api.generation.assemble(projectId);
      onProjectChange?.(p);
      await load();
      toast.success("Final audio rebuilt");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Rebuild failed");
    } finally {
      setBusy(null);
    }
  }

  const total = status?.total_chunks ?? chunks.length;
  const done = (status?.generated_chunks ?? 0) + (status?.failed_chunks ?? 0);
  const pct = job ? Math.round(job.progress_percentage) : total ? Math.round((done / total) * 100) : 0;
  const allGenerated = total > 0 && (status?.generated_chunks ?? 0) === total;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Generate</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPreview} disabled={busy !== null}>
              {busy === "preview" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Preview
            </Button>
            <Button variant="gold" size="sm" onClick={onGenerate} disabled={busy !== null || active}>
              {busy === "generate" || active ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {job && (active || job.status === "failed" || job.status === "completed") ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {active
                    ? `${job.status}… chunk ${Math.min(done + (job.status === "generating" ? 1 : 0), total)} of ${total}`
                    : job.status === "completed"
                      ? "Completed"
                      : "Failed"}
                </span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${job.status === "failed" ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {job.failed_chunks > 0 ? (
                <p className="text-xs text-destructive">{job.failed_chunks} chunk(s) failed.</p>
              ) : null}
              {job.error_message ? (
                <p className="text-xs text-destructive">{job.error_message}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Preview keeps GPU cost low. Generate splits the script into chunks and assembles the
              final narration.
            </p>
          )}
        </CardContent>
      </Card>

      {audio?.mp3_url ? (
        <Card>
          <CardHeader>
            <CardTitle>Final narration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <audio controls src={audio.mp3_url} className="w-full" />
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={audio.mp3_url} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> MP3
                </a>
              </Button>
              {audio.wav_url ? (
                <Button asChild size="sm" variant="outline">
                  <a href={audio.wav_url} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> WAV
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={onRebuild} disabled={busy !== null}>
                {busy === "assemble" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Rebuild
              </Button>
              {audio.duration_seconds ? (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(audio.duration_seconds)}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : allGenerated && !active ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <p className="text-sm text-muted-foreground">
              All chunks generated. Build the final MP3/WAV.
            </p>
            <Button size="sm" onClick={onRebuild} disabled={busy !== null}>
              {busy === "assemble" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Rebuild final
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Chunks</CardTitle>
          {chunks.length ? (
            <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {chunks.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No chunks yet"
              description="Generate the narration to split the script into chunks you can preview and regenerate individually."
            />
          ) : (
            <div className="space-y-2">
              {chunks.map((chunk) => (
                <ChunkRow key={chunk.id} chunk={chunk} onChanged={load} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChunkRow({ chunk, onChanged }: { chunk: Chunk; onChanged: () => void }) {
  async function play() {
    try {
      const { url } = await api.generation.chunkAudioUrl(chunk.id);
      await playUrl(url);
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not play chunk");
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <span className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
        {String(chunk.chunk_index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm">{chunk.processed_text}</p>
        <div className="mt-1 flex items-center gap-2">
          {chunkBadge(chunk.status)}
          {chunk.duration_seconds ? (
            <span className="text-xs text-muted-foreground">
              {formatDuration(chunk.duration_seconds)}
            </span>
          ) : null}
          {chunk.error_message ? (
            <span className="truncate text-xs text-destructive">{chunk.error_message}</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Play chunk"
          onClick={play}
          disabled={chunk.status !== "generated"}
        >
          <Play className="h-4 w-4" />
        </Button>
        <ChunkRegenerateDialog chunk={chunk} onDone={onChanged} />
      </div>
    </div>
  );
}

function ChunkRegenerateDialog({ chunk, onDone }: { chunk: Chunk; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(chunk.processed_text);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.generation.regenerateChunk(chunk.id, text);
      toast.success("Chunk regenerated — rebuild the final when you're happy.");
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Regeneration failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Regenerate chunk">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate chunk {chunk.chunk_index + 1}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[140px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Regenerating…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
