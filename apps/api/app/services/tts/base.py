"""TTS provider abstraction.

A provider exposes:
  * get_supported_controls() -> which knobs the UI should show
  * validate_settings()      -> clamp/filter user settings to supported ones
  * load_voice()             -> prepare a reference voice for generation
  * generate()               -> synthesize audio for a chunk of text

Only expose controls a provider actually supports. Never invent parameters.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ControlSpec:
    """Describes one user-facing generation control."""

    name: str
    label: str
    type: str  # "float" | "int" | "bool" | "enum" | "seed"
    default: Any
    minimum: float | None = None
    maximum: float | None = None
    step: float | None = None
    options: list[str] | None = None
    description: str = ""


@dataclass(frozen=True)
class VoiceReference:
    """A reference voice passed to the provider.

    Either raw `audio` bytes or a local `audio_path` should be provided.
    """

    voice_id: str
    audio: bytes | None = None
    audio_path: str | None = None
    sample_rate: int | None = None
    language: str = "en"


@dataclass(frozen=True)
class GenerationResult:
    """Audio produced for a single chunk."""

    audio: bytes
    sample_rate: int
    duration_seconds: float
    audio_format: str  # e.g. "wav"
    model_name: str
    generation_ms: int
    extra: dict[str, Any] = field(default_factory=dict)


def validate_against_controls(
    settings: dict[str, Any],
    controls: list[ControlSpec],
) -> dict[str, Any]:
    """Filter `settings` to known controls and clamp numeric ranges.

    Unknown keys are dropped (never silently trusted). Missing keys fall back
    to each control's default.
    """
    by_name = {c.name: c for c in controls}
    validated: dict[str, Any] = {}
    for name, spec in by_name.items():
        value = settings.get(name, spec.default)
        if spec.type in ("float", "int"):
            try:
                value = float(value)
            except (TypeError, ValueError):
                value = spec.default
            if spec.minimum is not None:
                value = max(spec.minimum, value)
            if spec.maximum is not None:
                value = min(spec.maximum, value)
            if spec.type == "int":
                value = int(round(value))
        elif spec.type == "bool":
            value = bool(value)
        elif spec.type == "enum" and spec.options:
            if value not in spec.options:
                value = spec.default
        validated[name] = value
    return validated


class TTSProvider(ABC):
    """Base class every TTS provider implements."""

    name: str = "base"
    model_name: str = "base"

    @abstractmethod
    def get_supported_controls(self) -> list[ControlSpec]:
        """Return the controls this provider actually supports."""

    def validate_settings(self, settings: dict[str, Any]) -> dict[str, Any]:
        """Clamp/filter user settings to this provider's supported controls."""
        return validate_against_controls(settings or {}, self.get_supported_controls())

    @abstractmethod
    def load_voice(self, reference: VoiceReference) -> Any:
        """Prepare a reference voice; return an opaque handle for generate()."""

    @abstractmethod
    def generate(
        self,
        text: str,
        voice: Any,
        settings: dict[str, Any],
    ) -> GenerationResult:
        """Synthesize audio for `text` using the prepared `voice`."""
