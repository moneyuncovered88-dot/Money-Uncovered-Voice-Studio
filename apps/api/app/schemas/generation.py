"""Generation / job / chunk schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ChunkStatus, GenerationStatus, JobType


class ChunkOut(BaseModel):
    id: str
    chunk_index: int
    processed_text: str
    status: ChunkStatus
    duration_seconds: float | None = None
    start_time_seconds: float | None = None
    end_time_seconds: float | None = None
    generation_attempt: int = 0
    error_message: str | None = None


class JobOut(BaseModel):
    id: str
    project_id: str
    type: JobType
    status: GenerationStatus
    total_chunks: int = 0
    completed_chunks: int = 0
    failed_chunks: int = 0
    progress_percentage: float = 0
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None


class StatusResponse(BaseModel):
    job: JobOut | None = None
    total_chunks: int = 0
    generated_chunks: int = 0
    failed_chunks: int = 0


class PreviewResponse(BaseModel):
    url: str
    duration_seconds: float


class AudioUrls(BaseModel):
    mp3_url: str | None = None
    wav_url: str | None = None
    duration_seconds: float | None = None


class RegenerateRequest(BaseModel):
    text: str | None = Field(default=None, max_length=5000)
