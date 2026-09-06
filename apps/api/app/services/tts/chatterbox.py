"""Chatterbox provider — dispatches generation to the RunPod GPU worker.

The model itself runs in `services/tts-worker` (see docs/RUNPOD_SETUP.md). This
class packages a request, calls RunPod, and returns the produced audio.

Controls exposed here are the ones the current Chatterbox-Turbo model documents
(`exaggeration`, `cfg_weight`) plus optional `temperature`/`seed`. The worker
introspects the model's real `generate()` signature and drops any kwarg the
installed version doesn't accept, so unsupported controls are never forced on
the model.
"""

from __future__ import annotations

import base64
import os
from collections.abc import Callable
from typing import Any

from app.errors import UpstreamError
from app.services.runpod_client import run_sync as default_run_sync
from app.services.tts.base import ControlSpec, GenerationResult, TTSProvider, VoiceReference

Runner = Callable[[dict[str, Any]], dict[str, Any]]


class ChatterboxProvider(TTSProvider):
    name = "chatterbox"
    model_name = "chatterbox-turbo"

    def __init__(self, model_name: str | None = None, runner: Runner | None = None) -> None:
        if model_name:
            self.model_name = model_name
        self._run = runner or default_run_sync

    def get_supported_controls(self) -> list[ControlSpec]:
        return [
            ControlSpec(
                name="exaggeration",
                label="Expressiveness",
                type="float",
                default=0.5,
                minimum=0.25,
                maximum=2.0,
                step=0.05,
                description="Higher is more expressive/emotive; ~0.5 is neutral.",
            ),
            ControlSpec(
                name="cfg_weight",
                label="Guidance / pacing",
                type="float",
                default=0.5,
                minimum=0.0,
                maximum=1.0,
                step=0.05,
                description="Style adherence; lower can slow the pacing.",
            ),
            ControlSpec(
                name="temperature",
                label="Variation",
                type="float",
                default=0.8,
                minimum=0.05,
                maximum=2.0,
                step=0.05,
                description="Sampling randomness (applied only if the model supports it).",
            ),
            ControlSpec(
                name="speed",
                label="Speed",
                type="float",
                default=1.0,
                minimum=0.5,
                maximum=1.5,
                step=0.05,
                description="Playback pace (pitch-preserving). 1.0 = normal, lower = slower.",
            ),
            ControlSpec(
                name="seed",
                label="Seed",
                type="seed",
                default=0,
                description="0 = random. Set a value for reproducible output.",
            ),
        ]

    def load_voice(self, reference: VoiceReference) -> dict[str, Any]:
        audio = reference.audio
        if audio is None and reference.audio_path:
            with open(reference.audio_path, "rb") as fh:
                audio = fh.read()
        ext = "wav"
        if reference.audio_path:
            ext = (os.path.splitext(reference.audio_path)[1].lstrip(".") or "wav").lower()
        return {
            "voice_id": reference.voice_id,
            "audio": audio,
            "ext": ext,
            "language": reference.language,
        }

    def generate(
        self,
        text: str,
        voice: Any,
        settings: dict[str, Any],
    ) -> GenerationResult:
        voice = voice or {}
        clean = self.validate_settings(settings)
        audio_bytes = voice.get("audio")

        payload: dict[str, Any] = {
            "text": text,
            "voice_reference_b64": (
                base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else None
            ),
            "voice_reference_ext": voice.get("ext", "wav"),
            "voice_id": voice.get("voice_id"),
            "settings": clean,
            "output_format": "wav",
        }

        output = self._run(payload)
        if str(output.get("status")) != "completed":
            raise UpstreamError(
                f"Worker error: {output.get('error') or 'unknown failure'}",
                code="tts_generation_failed",
                status_code=502,
            )

        audio_b64 = output.get("audio_b64")
        if not audio_b64:
            raise UpstreamError(
                "Worker returned no audio", code="tts_generation_failed", status_code=502
            )

        return GenerationResult(
            audio=base64.b64decode(audio_b64),
            sample_rate=int(output.get("sample_rate", 24_000)),
            duration_seconds=float(output.get("duration_seconds") or 0.0),
            audio_format="wav",
            model_name=str(output.get("model_name") or self.model_name),
            generation_ms=int(output.get("generation_ms") or 0),
            extra={"provider": "chatterbox"},
        )
