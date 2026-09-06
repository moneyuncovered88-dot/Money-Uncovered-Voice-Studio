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


# NOTE ON PACING: Chatterbox has no direct "speed" control. `cfg_weight` is the
# pacing lever — LOWER values slow the delivery down and make it more deliberate
# (the model's own default of 0.5 sounds noticeably fast for narration). The
# storyteller presets below were tuned by ear against real generations.
PRESETS: dict[str, Preset] = {
    "mu_storyteller": Preset(
        key="mu_storyteller",
        label="MU Storyteller (American, Normal Speed)",
        description="Warm American storyteller at a natural, unhurried pace.",
        settings={"exaggeration": 0.5, "cfg_weight": 0.3, "temperature": 0.7},
        sentence_pause_ms=260,
        paragraph_pause_ms=560,
        words_per_minute=150,
    ),
    "mu_storyteller_calm": Preset(
        key="mu_storyteller_calm",
        label="MU Storyteller (Calm, Slower)",
        description="Same American storyteller, a touch calmer and slower.",
        settings={"exaggeration": 0.45, "cfg_weight": 0.25, "temperature": 0.7},
        sentence_pause_ms=280,
        paragraph_pause_ms=600,
        words_per_minute=145,
    ),
    "mu_storyteller_slow": Preset(
        key="mu_storyteller_slow",
        label="MU Storyteller (Slow, Dramatic)",
        description="Deliberate and weighty — good for serious or dramatic segments.",
        settings={"exaggeration": 0.4, "cfg_weight": 0.2, "temperature": 0.65},
        sentence_pause_ms=300,
        paragraph_pause_ms=660,
        words_per_minute=140,
    ),
    "money_uncovered_documentary": Preset(
        key="money_uncovered_documentary",
        label="Money Uncovered Documentary",
        description="Neutral American, confident, moderate pace, controlled emotion.",
        settings={"exaggeration": 0.5, "cfg_weight": 0.35, "temperature": 0.6},
        sentence_pause_ms=240,
        paragraph_pause_ms=520,
        words_per_minute=150,
    ),
    "calm_explainer": Preset(
        key="calm_explainer",
        label="Calm Explainer",
        description="Relaxed, clear, unhurried — good for tutorials and how-tos.",
        settings={"exaggeration": 0.45, "cfg_weight": 0.3, "temperature": 0.5},
        sentence_pause_ms=260,
        paragraph_pause_ms=560,
        words_per_minute=140,
    ),
    "investigative_documentary": Preset(
        key="investigative_documentary",
        label="Investigative Documentary",
        description="Deliberate and weighty, with slightly longer pauses.",
        settings={"exaggeration": 0.5, "cfg_weight": 0.3, "temperature": 0.65},
        sentence_pause_ms=280,
        paragraph_pause_ms=620,
        words_per_minute=145,
    ),
    "financial_news": Preset(
        key="financial_news",
        label="Financial News",
        description="Brisk, crisp, informative — closer to a news read.",
        settings={"exaggeration": 0.5, "cfg_weight": 0.4, "temperature": 0.55},
        sentence_pause_ms=180,
        paragraph_pause_ms=420,
        words_per_minute=165,
    ),
    "dramatic_documentary": Preset(
        key="dramatic_documentary",
        label="Dramatic Documentary",
        description="More expressive and cinematic, still controlled.",
        settings={"exaggeration": 0.6, "cfg_weight": 0.3, "temperature": 0.8},
        sentence_pause_ms=300,
        paragraph_pause_ms=680,
        words_per_minute=140,
    ),
}

DEFAULT_PRESET_KEY = "mu_storyteller"


def get_preset(key: str | None) -> Preset:
    """Return a preset by key, falling back to the default."""
    return PRESETS.get(key or DEFAULT_PRESET_KEY, PRESETS[DEFAULT_PRESET_KEY])


def list_presets() -> list[Preset]:
    return list(PRESETS.values())
