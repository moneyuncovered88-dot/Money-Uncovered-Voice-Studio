"""Pronunciation dictionary schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PronunciationBase(BaseModel):
    term: str = Field(min_length=1, max_length=200)
    spoken_form: str = Field(min_length=1, max_length=400)
    case_sensitive: bool = False
    whole_word: bool = True
    enabled: bool = True
    notes: str | None = Field(default=None, max_length=1000)


class PronunciationCreate(PronunciationBase):
    pass


class PronunciationUpdate(BaseModel):
    term: str | None = Field(default=None, min_length=1, max_length=200)
    spoken_form: str | None = Field(default=None, min_length=1, max_length=400)
    case_sensitive: bool | None = None
    whole_word: bool | None = None
    enabled: bool | None = None
    notes: str | None = Field(default=None, max_length=1000)


class PronunciationOut(PronunciationBase):
    id: str
    created_at: datetime
    updated_at: datetime


class PronunciationPreviewRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class PronunciationPreviewResponse(BaseModel):
    original: str
    processed: str
