"""Voice profile schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class VoiceBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    language: str = Field(default="en", max_length=20)
    accent: str | None = Field(default=None, max_length=80)
    style: str | None = Field(default=None, max_length=120)
    use_case: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)


class VoiceCreate(VoiceBase):
    # Voice rights: must be explicitly confirmed at creation time.
    authorization_confirmed: bool = False

    @field_validator("authorization_confirmed")
    @classmethod
    def _must_confirm(cls, value: bool) -> bool:
        if not value:
            raise ValueError(
                "You must confirm you own or have permission to use this voice."
            )
        return value


class VoiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    language: str | None = Field(default=None, max_length=20)
    accent: str | None = Field(default=None, max_length=80)
    style: str | None = Field(default=None, max_length=120)
    use_case: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class VoiceOut(VoiceBase):
    id: str
    reference_audio_path: str | None = None
    reference_duration_seconds: float | None = None
    reference_sample_rate: int | None = None
    authorization_confirmed: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
