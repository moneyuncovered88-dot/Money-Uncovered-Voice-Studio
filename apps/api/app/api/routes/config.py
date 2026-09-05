"""Config endpoints that power the settings + voice UI.

Voice controls are sourced from the ACTIVE provider so the UI only ever shows
controls the model actually supports.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter

from app.config import get_settings
from app.dependencies import CurrentUserDep
from app.services.presets import list_presets
from app.services.tts.factory import get_tts_provider

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/presets")
def get_presets(_: CurrentUserDep) -> list[dict]:
    return [asdict(p) for p in list_presets()]


@router.get("/voice-controls")
def get_voice_controls(_: CurrentUserDep) -> dict:
    provider = get_tts_provider()
    return {
        "provider": provider.name,
        "model_name": provider.model_name,
        "controls": [asdict(c) for c in provider.get_supported_controls()],
    }


@router.get("/defaults")
def get_defaults(_: CurrentUserDep) -> dict:
    settings = get_settings()
    return {
        "default_output_format": settings.default_output_format,
        "default_words_per_minute": settings.default_words_per_minute,
        "tts_max_chunk_chars": settings.tts_max_chunk_chars,
        "gpu_cost_per_hour": settings.gpu_cost_per_hour,
    }
