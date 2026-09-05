"""Request parsing/validation for the RunPod worker (pure — no torch/ML imports).

Kept dependency-free so it can be unit-tested without a GPU or the model.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from config import MAX_TEXT_CHARS

_ALLOWED_EXT = {"wav", "mp3", "m4a", "flac"}


@dataclass
class GenRequest:
    text: str
    voice_reference_b64: str | None
    voice_reference_ext: str
    voice_id: str | None
    settings: dict[str, Any] = field(default_factory=dict)
    output_format: str = "wav"


def parse_input(data: Any) -> GenRequest:
    """Validate and normalize the RunPod job `input` payload.

    Raises ValueError with a clear message on invalid input.
    """
    if not isinstance(data, dict):
        raise ValueError("input must be a JSON object")

    text = (data.get("text") or "").strip()
    if not text:
        raise ValueError("`text` is required")
    if len(text) > MAX_TEXT_CHARS:
        raise ValueError(f"`text` exceeds {MAX_TEXT_CHARS} characters")

    ext = str(data.get("voice_reference_ext") or "wav").lower().lstrip(".")
    if ext not in _ALLOWED_EXT:
        ext = "wav"

    settings = data.get("settings") or {}
    if not isinstance(settings, dict):
        raise ValueError("`settings` must be an object")

    ref = data.get("voice_reference_b64")
    if ref is not None and not isinstance(ref, str):
        raise ValueError("`voice_reference_b64` must be a base64 string")

    return GenRequest(
        text=text,
        voice_reference_b64=ref,
        voice_reference_ext=ext,
        voice_id=data.get("voice_id"),
        settings=settings,
        output_format=str(data.get("output_format") or "wav").lower(),
    )
