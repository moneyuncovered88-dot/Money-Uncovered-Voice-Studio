"""Pluggable TTS provider layer.

`TTSProvider` is the abstraction; concrete providers implement it. This lets us
swap Chatterbox for XTTS / Kokoro / OpenAI TTS / ElevenLabs / Cartesia later
without touching the orchestration code.

Note: import `get_tts_provider` from `app.services.tts.factory` (kept out of
this package __init__ so the pure base/mock modules stay dependency-light).
"""

from app.services.tts.base import (
    ControlSpec,
    GenerationResult,
    TTSProvider,
    VoiceReference,
)

__all__ = [
    "ControlSpec",
    "GenerationResult",
    "TTSProvider",
    "VoiceReference",
]
