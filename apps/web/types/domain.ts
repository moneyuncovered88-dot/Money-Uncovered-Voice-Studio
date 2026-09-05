/**
 * Domain enums — mirror apps/api/app/models/enums.py and the Postgres enums.
 * Keep these string values in sync.
 */

export const GENERATION_STATUSES = [
  "draft",
  "queued",
  "preprocessing",
  "generating",
  "assembling",
  "normalizing",
  "uploading",
  "completed",
  "failed",
  "cancelled",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const CHUNK_STATUSES = [
  "waiting",
  "queued",
  "generating",
  "generated",
  "failed",
] as const;
export type ChunkStatus = (typeof CHUNK_STATUSES)[number];

export type JobType = "preview" | "full" | "regenerate" | "assemble";
export type OutputFormat = "mp3" | "wav";

export const STATUS_LABELS: Record<GenerationStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  preprocessing: "Preprocessing",
  generating: "Generating",
  assembling: "Assembling",
  normalizing: "Normalizing",
  uploading: "Uploading",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Tailwind classes for a status badge, tuned to the theme. */
export const STATUS_BADGE_CLASS: Record<GenerationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  queued: "bg-muted text-muted-foreground",
  preprocessing: "bg-gold/15 text-gold",
  generating: "bg-gold/15 text-gold",
  assembling: "bg-gold/15 text-gold",
  normalizing: "bg-gold/15 text-gold",
  uploading: "bg-gold/15 text-gold",
  completed: "bg-primary/15 text-primary",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};
