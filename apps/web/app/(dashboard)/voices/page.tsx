"use client";

import { CheckCircle2, Mic2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { VoiceFormDialog } from "@/components/voices/voice-form-dialog";
import { VoicePlayButton } from "@/components/voices/voice-play-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Voice } from "@/types/api";

export default function VoicesPage() {
  const { data, loading, error, reload } = useApiData<Voice[]>(() => api.voices.list(), []);
  const voices = data ?? [];

  async function remove(id: string) {
    try {
      await api.voices.remove(id);
      toast.success("Voice deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not delete voice");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voices"
        description="Authorized narrator voices for your narration projects."
        actions={
          <VoiceFormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Add voice
              </Button>
            }
            onSaved={reload}
          />
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : voices.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="No voices yet"
          description="Add an authorized narrator voice to use across your projects."
          action={
            <VoiceFormDialog
              trigger={<Button>Add voice</Button>}
              onSaved={reload}
            />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((voice) => (
            <Card key={voice.id} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{voice.name}</CardTitle>
                  {voice.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="muted">Inactive</Badge>
                  )}
                </div>
                {voice.accent ? (
                  <Badge variant="outline" className="w-fit">
                    {voice.accent}
                  </Badge>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {voice.description ?? "No description"}
                </p>
                <div className="mt-auto space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Rights confirmed
                  </div>
                  <div>Added {formatDate(voice.created_at)}</div>
                  <div>
                    Reference:{" "}
                    {voice.reference_audio_path
                      ? voice.reference_duration_seconds
                        ? `${Math.round(voice.reference_duration_seconds)}s uploaded`
                        : "uploaded"
                      : "not uploaded yet"}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <VoicePlayButton voiceId={voice.id} disabled={!voice.reference_audio_path} />
                  <VoiceFormDialog
                    voice={voice}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                    }
                    onSaved={reload}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Delete voice">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    title="Delete voice?"
                    description="Projects using this voice will lose the reference."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => remove(voice.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
