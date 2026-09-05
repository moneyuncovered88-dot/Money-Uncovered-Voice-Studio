"""Mock TTS provider for local development (no GPU).

Generates a valid WAV whose length is proportional to the text, so the whole
frontend/backend flow (chunking, assembly, players, timeline) can be exercised
without RunPod. NEVER use in production — the factory guards against that.
"""

from __future__ import annotations

import io
import math
import struct
import time
import wave
from typing import Any

from app.preprocessing.text_stats import count_words, estimate_duration_seconds
from app.services.tts.base import (
    ControlSpec,
    GenerationResult,
    TTSProvider,
    VoiceReference,
)

_SAMPLE_RATE = 24_000
_WORDS_PER_MINUTE = 150


class MockTTSProvider(TTSProvider):
    name = "mock"
    model_name = "mock-tts-v1"

    def get_supported_controls(self) -> list[ControlSpec]:
        # A representative set so the UI has something to render in dev.
        return [
            ControlSpec(
                name="temperature",
                label="Expressiveness",
                type="float",
                default=0.7,
                minimum=0.1,
                maximum=1.5,
                step=0.05,
                description="Higher is more varied; lower is steadier.",
            ),
            ControlSpec(
                name="seed",
                label="Seed",
                type="seed",
                default=0,
                description="Set for reproducible output (0 = random).",
            ),
        ]

    def load_voice(self, reference: VoiceReference) -> dict[str, Any]:
        # Nothing to load for the mock; echo the reference id back.
        return {"voice_id": reference.voice_id}

    def generate(
        self,
        text: str,
        voice: Any,
        settings: dict[str, Any],
    ) -> GenerationResult:
        start = time.perf_counter()
        words = count_words(text)
        duration = max(0.8, estimate_duration_seconds(words, _WORDS_PER_MINUTE))
        audio = _render_soft_tone(duration, seed=int(settings.get("seed", 0) or 0))
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return GenerationResult(
            audio=audio,
            sample_rate=_SAMPLE_RATE,
            duration_seconds=round(duration, 3),
            audio_format="wav",
            model_name=self.model_name,
            generation_ms=elapsed_ms,
            extra={"mock": True},
        )


def _render_soft_tone(duration_seconds: float, *, seed: int = 0) -> bytes:
    """Render a very quiet sine tone (audible marker, not silence)."""
    n = int(_SAMPLE_RATE * duration_seconds)
    freq = 180.0 + (seed % 5) * 20.0  # slight variation by seed
    amplitude = 0.02  # quiet
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(_SAMPLE_RATE)
        frames = bytearray()
        for i in range(n):
            sample = int(amplitude * 32767.0 * math.sin(2 * math.pi * freq * i / _SAMPLE_RATE))
            frames += struct.pack("<h", sample)
        wav.writeframes(bytes(frames))
    return buf.getvalue()
