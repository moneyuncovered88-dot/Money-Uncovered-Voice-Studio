"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiRequestError } from "@/lib/api";
import type { Voice } from "@/types/api";

interface VoiceFormDialogProps {
  trigger: ReactNode;
  voice?: Voice; // present => edit mode
  onSaved: () => void;
}

const ACCEPT = ".wav,.mp3,.m4a,.flac";

export function VoiceFormDialog({ trigger, voice, onSaved }: VoiceFormDialogProps) {
  const isEdit = Boolean(voice);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(voice?.name ?? "");
  const [description, setDescription] = useState(voice?.description ?? "");
  const [language, setLanguage] = useState(voice?.language ?? "en");
  const [accent, setAccent] = useState(voice?.accent ?? "General American");
  const [style, setStyle] = useState(voice?.style ?? "Professional documentary");
  const [useCase, setUseCase] = useState(voice?.use_case ?? "");
  const [notes, setNotes] = useState(voice?.notes ?? "");
  const [authorized, setAuthorized] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const hasReference = Boolean(voice?.reference_audio_path);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !authorized) {
      toast.error("Please confirm you own or have permission to use this voice.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        language,
        accent: accent || null,
        style: style || null,
        use_case: useCase || null,
        notes: notes || null,
      };
      const saved =
        isEdit && voice
          ? await api.voices.update(voice.id, payload)
          : await api.voices.create({ ...payload, authorization_confirmed: true });

      if (file) {
        await api.voices.uploadReference(saved.id, file);
      }

      toast.success(isEdit ? "Voice updated" : "Voice added");
      setOpen(false);
      setFile(null);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not save voice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit voice" : "Add voice"}</DialogTitle>
          <DialogDescription>
            Upload a 5&ndash;30 second reference recording of the narrator you&apos;re authorized to
            use.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="v-name">Voice name</Label>
            <Input
              id="v-name"
              placeholder="Money Uncovered Narrator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-desc">Description</Label>
            <Textarea
              id="v-desc"
              placeholder="Neutral American male financial documentary narration"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="v-lang">Language</Label>
              <Input id="v-lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-accent">Accent</Label>
              <Input id="v-accent" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="v-style">Style</Label>
              <Input id="v-style" value={style} onChange={(e) => setStyle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-usecase">Use case</Label>
              <Input
                id="v-usecase"
                placeholder="YouTube narration"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-file">Reference recording</Label>
            <Input
              id="v-file"
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              WAV, MP3, M4A, or FLAC · up to 25&nbsp;MB.{" "}
              {isEdit
                ? hasReference
                  ? "A reference is already uploaded — choosing a file replaces it."
                  : "No reference uploaded yet."
                : "Optional now; you can add it later."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-notes">Notes</Label>
            <Textarea id="v-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {!isEdit ? (
            <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
              />
              <span className="text-muted-foreground">
                I confirm that I own or have permission to use this voice.
              </span>
            </label>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add voice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
