"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clock, Hash, Info, Layers, Trash2, Type, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useApiData } from "@/hooks/use-api-data";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { api, ApiRequestError } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { Preset, ScriptAnalysis, Voice } from "@/types/api";

const NO_VOICE = "none";
const DRAFT_KEY = "mus-draft-new";

interface Draft {
  title?: string;
  videoTitle?: string;
  script?: string;
  notes?: string;
  preset?: string;
  speakHeadings?: boolean;
}

function readDraft(): Draft {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Draft;
  } catch {
    return {};
  }
}

function defaultPreset(): string {
  try {
    return localStorage.getItem("mus-default-preset") || "mu_storyteller";
  } catch {
    return "mu_storyteller";
  }
}

export default function NewNarrationPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data } = useApiData<{ voices: Voice[]; presets: Preset[] }>(async () => {
    const [voices, presets] = await Promise.all([api.voices.list(), api.config.presets()]);
    return { voices, presets };
  }, []);
  const voices = data?.voices ?? [];
  const presets = data?.presets ?? [];

  const [title, setTitle] = useState(() => readDraft().title ?? "");
  const [videoTitle, setVideoTitle] = useState(() => readDraft().videoTitle ?? "");
  const [voiceId, setVoiceId] = useState<string>(NO_VOICE);
  const [preset, setPreset] = useState(() => readDraft().preset ?? defaultPreset());
  const [script, setScript] = useState(() => readDraft().script ?? "");
  const [notes, setNotes] = useState(() => readDraft().notes ?? "");
  const [speakHeadings, setSpeakHeadings] = useState(() => readDraft().speakHeadings ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);

  // Autosave the draft to localStorage as the user types (external write — no
  // setState, so it's an appropriate effect).
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title, videoTitle, script, notes, preset, speakHeadings }),
      );
    } catch {
      // storage unavailable — drafting still works in-memory
    }
  }, [title, videoTitle, script, notes, preset, speakHeadings]);

  const runAnalyze = useDebouncedCallback(async (text: string, presetKey: string, sh: boolean) => {
    if (!text.trim()) {
      setAnalysis(null);
      return;
    }
    try {
      setAnalysis(await api.projects.analyze({ script: text, narration_preset: presetKey, speak_headings: sh }));
    } catch {
      // best-effort
    }
  }, 600);

  useEffect(() => {
    runAnalyze(script, preset, speakHeadings);
  }, [script, preset, speakHeadings, runAnalyze]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("Text file is too large (max 1 MB).");
      return;
    }
    try {
      const text = await file.text();
      setScript(text);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      toast.success("Script imported");
    } catch {
      toast.error("Could not read that file.");
    } finally {
      e.target.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Give your project a name");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.projects.create({
        title,
        video_title: videoTitle || null,
        voice_profile_id: voiceId === NO_VOICE ? null : voiceId,
        narration_preset: preset,
        script_original: script,
        notes: notes || null,
        speak_headings: speakHeadings,
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      toast.success("Project created");
      router.push(`/projects/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not create project");
    } finally {
      setSubmitting(false);
    }
  }

  const metrics = [
    { icon: Type, value: analysis?.word_count ?? 0, label: "words" },
    { icon: Hash, value: analysis?.character_count ?? script.length, label: "characters" },
    { icon: Clock, value: `~${formatDuration(analysis?.estimated_duration_seconds ?? 0)}`, label: "est. length" },
    { icon: Layers, value: analysis?.chunk_count ?? 0, label: "chunks" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="Studio"
        description="Compose a narration project. You'll Preview and Generate on the next screen."
        actions={
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create & Continue"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Project details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Project name</Label>
                <Input id="title" placeholder="Day 1 – Credit Cards Took Over America" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoTitle">Video title</Label>
                <Input id="videoTitle" placeholder="How Credit Cards Quietly Took Over America" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Script</CardTitle>
              <div className="flex items-center gap-1.5">
                <input ref={fileRef} type="file" accept=".txt,.md,text/plain" hidden onChange={onUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Import .txt
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setScript("")} disabled={!script}>
                  <Trash2 className="h-4 w-4" /> Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                className="min-h-[360px] font-mono text-sm leading-relaxed"
                placeholder="Paste your narration script here, or import a .txt file…"
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3">
                {metrics.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary/70" />
                    <span className="font-medium text-foreground">{value}</span> {label}
                  </div>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">Autosaved as you type</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice &amp; style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VOICE}>No voice yet</SelectItem>
                    {voices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {voices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No voices yet — add one on the Voices page.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Narration style</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{presets.find((p) => p.key === preset)?.description}</p>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="speakHeadings">Speak section headings</Label>
                  <p className="text-xs text-muted-foreground">Read lines like &quot;SECTION 1&quot; aloud.</p>
                </div>
                <Switch id="speakHeadings" checked={speakHeadings} onCheckedChange={setSpeakHeadings} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Optional production notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Generation runs from the project page after saving. Preview keeps GPU cost low.</p>
          </div>
        </div>
      </div>
    </form>
  );
}
