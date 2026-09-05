"""Narration presets.

A preset is just a named bundle of valid generation + audio settings. Presets
never claim style controls the model does not support — unsupported keys are
dropped by the provider's validate_settings(). Pause values feed audio
assembly (Phase 6).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Preset:
    key: str
    label: str
    description: str
    # Provider generation settings (validated per-provider before use).
    settings: dict[str, Any] = field(default_factory=dict)
    # Audio assembly hints (milliseconds).
    sentence_pause_ms: int = 220
    paragraph_pause_ms: int = 500
    words_per_minute: int = 150


PRESETS: dict[str, Preset] = {
    "money_uncovered_documentary": Preset(
        key="money_uncovered_documentary",
        label="Money Uncovered Documentary",
        description="Neutral American, confident, moderate pace, controlled emotion.",
        settings={"temperature": 0.6},
        sentence_pause_ms=240,
        paragraph_pause_ms=520,
        words_per_minute=150,
    ),
    "calm_explainer": Preset(
        key="calm_explainer",
        label="Calm Explainer",
        description="Relaxed, clear, unhurried — good for tutorials and how-tos.",
        settings={"temperature": 0.5},
        sentence_pause_ms=260,
        paragraph_pause_ms=560,
        words_per_minute=140,
    ),
    "investigative_documentary": Preset(
        key="investigative_documentary",
        label="Investigative Documentary",
        description="Deliberate and weighty, with slightly longer pauses.",
        settings={"temperature": 0.65},
        sentence_pause_ms=280,
        paragraph_pause_ms=620,
        words_per_minute=145,
    ),
    "financial_news": Preset(
        key="financial_news",
        label="Financial News",
        description="Brisk, crisp, informative — closer to a news read.",
        settings={"temperature": 0.55},
        sentence_pause_ms=180,
        paragraph_pause_ms=420,
        words_per_minute=165,
    ),
    "dramatic_documentary": Preset(
        key="dramatic_documentary",
        label="Dramatic Documentary",
        description="More expressive and cinematic, still controlled.",
        settings={"temperature": 0.8},
        sentence_pause_ms=300,
        paragraph_pause_ms=680,
        words_per_minute=140,
    ),
}

DEFAULT_PRESET_KEY = "money_uncovered_documentary"


def get_preset(key: str | None) -> Preset:
    """Return a preset by key, falling back to the default."""
    return PRESETS.get(key or DEFAULT_PRESET_KEY, PRESETS[DEFAULT_PRESET_KEY])


def list_presets() -> list[Preset]:
    return list(PRESETS.values())
