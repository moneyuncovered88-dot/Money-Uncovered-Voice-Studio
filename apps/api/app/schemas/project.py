"""Project schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import GenerationStatus


class ProjectBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    video_title: str | None = Field(default=None, max_length=300)
    voice_profile_id: str | None = None
    narration_preset: str = "mu_storyteller"
    speak_headings: bool = False
    notes: str | None = Field(default=None, max_length=2000)


class ProjectCreate(ProjectBase):
    script_original: str = Field(default="", max_length=200_000)
    settings: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    video_title: str | None = Field(default=None, max_length=300)
    voice_profile_id: str | None = None
    narration_preset: str | None = None
    speak_headings: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)
    script_original: str | None = Field(default=None, max_length=200_000)
    settings: dict[str, Any] | None = None


class ProjectOut(ProjectBase):
    id: str
    slug: str | None = None
    status: GenerationStatus
    script_original: str = ""
    script_processed: str | None = None
    word_count: int = 0
    character_count: int = 0
    estimated_duration_seconds: float | None = None
    final_duration_seconds: float | None = None
    final_audio_mp3_path: str | None = None
    final_audio_wav_path: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    model_name: str | None = None
    created_at: datetime
    updated_at: datetime


class ProjectListItem(BaseModel):
    """Lightweight shape for dashboard / project lists."""

    id: str
    title: str
    video_title: str | None = None
    slug: str | None = None
    status: GenerationStatus
    voice_profile_id: str | None = None
    word_count: int = 0
    estimated_duration_seconds: float | None = None
    final_duration_seconds: float | None = None
    updated_at: datetime
    created_at: datetime


class ScriptAnalysis(BaseModel):
    """Result of analyzing a script without persisting it."""

    word_count: int
    character_count: int
    estimated_duration_seconds: float
    chunk_count: int
