"""Shared response schemas."""

from __future__ import annotations

from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class DeletedResponse(BaseModel):
    id: str
    deleted: bool = True
