"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
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

export default function NewNarrationPage() {
  const router = useRouter();

  const { data } = useApiData<{ voices: Voice[]; presets: Preset[] }>(async () => {
    const [voices, presets] = await Promise.all([api.voices.list(), api.config.presets()]);
    return { voices, presets };
  }, []);
  const voices = data?.voices ?? [];
  const presets = data?.presets ?? [];

  const [title, setTitle] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [voiceId, setVoiceId] = useState<string>(NO_VOICE);
  const [preset, setPreset] = useState("mu_storyteller");
  const [script, setScript] = useState("");
  const [notes, setNotes] = useState("");
  const [speakHeadings, setSpeakHeadings] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);

  const runAnalyze = useDebouncedCallback(async (text: string, presetKey: string, sh: boolean) => {
    if (!text.trim()) {
      setAnalysis(null);
      return;
    }
    try {
      const result = await api.projects.analyze({
        script: text,
        narration_preset: presetKey,
        speak_headings: sh,
      });
      setAnalysis(result);
    } catch {
      // Analysis is best-effort; ignore transient failures.
    }
  }, 600);

  useEffect(() => {
    runAnalyze(script, preset, speakHeadings);
  }, [script, preset, speakHeadings, runAnalyze]);

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
      toast.success("Project created");
      router.push(`/projects/${created.id}`);
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title="New Narration"
        description="Create a project, paste your script, and pick a voice. You'll Preview and Generate on the next screen."
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project name</Label>
                <Input
                  id="title"
                  placeholder="Day 1 – Credit Cards Took Over America"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoTitle">Video title</Label>
                <Input
                  id="videoTitle"
                  placeholder="How Credit Cards Quietly Took Over America"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                className="min-h-[340px] font-mono text-sm leading-relaxed"
                placeholder="Paste your Money Uncovered narration script here…"
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>{analysis?.word_count ?? 0} words</span>
                <span>{analysis?.character_count ?? script.length} characters</span>
                <span>~{formatDuration(analysis?.estimated_duration_seconds ?? 0)} est. duration</span>
                <span>{analysis?.chunk_count ?? 0} chunks</span>
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
                  <p className="text-xs text-muted-foreground">
                    No voices yet — add one on the Voices page.
                  </p>
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
                <p className="text-xs text-muted-foreground">
                  {presets.find((p) => p.key === preset)?.description}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="speakHeadings">Speak section headings</Label>
                  <p className="text-xs text-muted-foreground">
                    Read lines like &quot;SECTION 1&quot; aloud.
                  </p>
                </div>
                <Switch
                  id="speakHeadings"
                  checked={speakHeadings}
                  onCheckedChange={setSpeakHeadings}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Optional production notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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
