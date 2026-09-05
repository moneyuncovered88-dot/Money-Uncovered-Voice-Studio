"use client";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import type { Preset, VoiceControlsResponse } from "@/types/api";

interface Defaults {
  default_output_format: string;
  default_words_per_minute: number;
  tts_max_chunk_chars: number;
  gpu_cost_per_hour: number;
}

export default function SettingsPage() {
  const { data, loading } = useApiData<{
    defaults: Defaults;
    controls: VoiceControlsResponse;
    presets: Preset[];
  }>(async () => {
    const [defaults, controls, presets] = await Promise.all([
      api.config.defaults(),
      api.config.voiceControls(),
      api.config.presets(),
    ]);
    return { defaults, controls, presets };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Studio defaults and engine status. These come from the backend configuration."
      />

      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Narration defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Default output format" value={data.defaults.default_output_format.toUpperCase()} />
              <Separator />
              <Row label="Words per minute (estimate)" value={String(data.defaults.default_words_per_minute)} />
              <Separator />
              <Row label="Max chunk characters" value={String(data.defaults.tts_max_chunk_chars)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TTS engine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row
                label="Provider"
                value={<Badge variant={data.controls.provider === "mock" ? "gold" : "default"}>{data.controls.provider}</Badge>}
              />
              <Separator />
              <Row label="Model" value={data.controls.model_name} />
              <Separator />
              <Row label="GPU cost / hour" value={`$${data.defaults.gpu_cost_per_hour.toFixed(2)}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Presets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.presets.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.words_per_minute} wpm</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported voice controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.controls.controls.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.type}</span>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Only controls the active model actually supports are shown.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Account-level destructive actions (bulk delete, reset) will live here. Delete individual
          projects and voices from their own pages.
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
