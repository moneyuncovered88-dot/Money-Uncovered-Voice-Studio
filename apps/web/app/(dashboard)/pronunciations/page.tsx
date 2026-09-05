"use client";

import { useEffect, useState } from "react";
import { BookA, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PronunciationDialog } from "@/components/pronunciations/pronunciation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiData } from "@/hooks/use-api-data";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { api, ApiRequestError } from "@/lib/api";
import type { Pronunciation } from "@/types/api";

export default function PronunciationsPage() {
  const { data, loading, error, reload } = useApiData<Pronunciation[]>(
    () => api.pronunciations.list(),
    [],
  );
  const entries = data ?? [];

  const [sample, setSample] = useState("The FICO score and APR affect your S&P 500 returns.");
  const [processed, setProcessed] = useState("");

  const runPreview = useDebouncedCallback(async (text: string) => {
    if (!text.trim()) {
      setProcessed("");
      return;
    }
    try {
      const res = await api.pronunciations.preview(text);
      setProcessed(res.processed);
    } catch {
      // best-effort
    }
  }, 500);

  useEffect(() => {
    runPreview(sample);
  }, [sample, data, runPreview]);

  async function toggle(entry: Pronunciation) {
    try {
      await api.pronunciations.update(entry.id, { enabled: !entry.enabled });
      reload();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not update entry");
    }
  }

  async function remove(id: string) {
    try {
      await api.pronunciations.remove(id);
      toast.success("Entry deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not delete entry");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pronunciation Dictionary"
        description="Fix how finance terms are spoken. Replacements apply before generation."
        actions={
          <PronunciationDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" /> Add entry
              </Button>
            }
            onSaved={reload}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Original
            </p>
            <Textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              className="min-h-[96px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Processed (spoken)
            </p>
            <div className="min-h-[96px] rounded-md border border-border bg-muted/30 p-3 text-sm">
              {processed || <span className="text-muted-foreground">Nothing to preview yet.</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-2">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-4 p-5">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={reload}>
                Retry
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              className="m-4"
              icon={BookA}
              title="No entries yet"
              description="Add finance terms like FICO, APR, or S&P 500 with their spoken forms."
              action={
                <PronunciationDialog
                  trigger={<Button>Add entry</Button>}
                  onSaved={reload}
                />
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Spoken</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.term}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.spoken_form}</TableCell>
                    <TableCell className="space-x-1">
                      {entry.whole_word ? <Badge variant="muted">whole word</Badge> : null}
                      {entry.case_sensitive ? <Badge variant="muted">case</Badge> : null}
                    </TableCell>
                    <TableCell>
                      <Switch checked={entry.enabled} onCheckedChange={() => toggle(entry)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PronunciationDialog
                          entry={entry}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                          onSaved={reload}
                        />
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          title="Delete entry?"
                          confirmLabel="Delete"
                          destructive
                          onConfirm={() => remove(entry.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
