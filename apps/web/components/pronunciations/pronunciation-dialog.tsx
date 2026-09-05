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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiRequestError } from "@/lib/api";
import type { Pronunciation } from "@/types/api";

interface PronunciationDialogProps {
  trigger: ReactNode;
  entry?: Pronunciation;
  onSaved: () => void;
}

export function PronunciationDialog({ trigger, entry, onSaved }: PronunciationDialogProps) {
  const isEdit = Boolean(entry);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [term, setTerm] = useState(entry?.term ?? "");
  const [spoken, setSpoken] = useState(entry?.spoken_form ?? "");
  const [caseSensitive, setCaseSensitive] = useState(entry?.case_sensitive ?? false);
  const [wholeWord, setWholeWord] = useState(entry?.whole_word ?? true);
  const [enabled, setEnabled] = useState(entry?.enabled ?? true);
  const [notes, setNotes] = useState(entry?.notes ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        term,
        spoken_form: spoken,
        case_sensitive: caseSensitive,
        whole_word: wholeWord,
        enabled,
        notes: notes || null,
      };
      if (isEdit && entry) {
        await api.pronunciations.update(entry.id, payload);
      } else {
        await api.pronunciations.create(payload);
      }
      toast.success(isEdit ? "Entry updated" : "Entry added");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit entry" : "Add entry"}</DialogTitle>
          <DialogDescription>
            The written term is replaced with the spoken form before generation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-term">Written term</Label>
              <Input
                id="p-term"
                placeholder="FICO"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-spoken">Spoken form</Label>
              <Input
                id="p-spoken"
                placeholder="fy-co"
                value={spoken}
                onChange={(e) => setSpoken(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-3 rounded-md border border-border p-3">
            <ToggleRow
              label="Whole word only"
              hint="Avoids matching inside other words."
              checked={wholeWord}
              onChange={setWholeWord}
            />
            <ToggleRow
              label="Case sensitive"
              hint="Match the exact letter casing."
              checked={caseSensitive}
              onChange={setCaseSensitive}
            />
            <ToggleRow label="Enabled" checked={enabled} onChange={setEnabled} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
