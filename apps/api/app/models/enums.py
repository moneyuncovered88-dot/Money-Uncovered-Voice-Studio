"""Domain enums mirroring the Postgres enum types (see supabase/migrations).

Keep these in sync with 0001_init.sql. The web frontend mirrors the same
string values in `apps/web/types/domain.ts`.
"""

from __future__ import annotations

from enum import StrEnum


class GenerationStatus(StrEnum):
    DRAFT = "draft"
    QUEUED = "queued"
    PREPROCESSING = "preprocessing"
    GENERATING = "generating"
    ASSEMBLING = "assembling"
    NORMALIZING = "normalizing"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ChunkStatus(StrEnum):
    WAITING = "waiting"
    QUEUED = "queued"
    GENERATING = "generating"
    GENERATED = "generated"
    FAILED = "failed"


class JobType(StrEnum):
    PREVIEW = "preview"
    FULL = "full"
    REGENERATE = "regenerate"
    ASSEMBLE = "assemble"


class OutputFormat(StrEnum):
    MP3 = "mp3"
    WAV = "wav"
