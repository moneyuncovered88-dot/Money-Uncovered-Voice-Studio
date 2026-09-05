"""Chatterbox provider (backend-side dispatch to the RunPod GPU worker).

IMPORTANT — implementation is deferred to Phase 4 (TTS Worker) by design.

On the BACKEND, "chatterbox" does not load the model. The model runs in the
RunPod serverless worker (`services/tts-worker`). This provider will:
  * package a generation request (text, voice reference handle, settings),
  * call the RunPod endpoint,
  * return the produced audio + metadata.

Before implementing, inspect the CURRENT official Chatterbox implementation
(GitHub: resemble-ai/chatterbox) to confirm the real, supported controls
(e.g. exaggeration, cfg_weight, temperature, seed) and audio format. Do not
invent parameters. The control specs below are a PLACEHOLDER shape and MUST be
reconciled with the model's actual API in Phase 4 — see docs/RUNPOD_SETUP.md.
"""

from __future__ import annotations

from typing import Any

from app.errors import UpstreamError
from app.services.tts.base import ControlSpec, GenerationResult, TTSProvider, VoiceReference


class ChatterboxProvider(TTSProvider):
    name = "chatterbox"
    model_name = "chatterbox-turbo"

    def __init__(self, model_name: str | None = None) -> None:
        if model_name:
            self.model_name = model_name

    def get_supported_controls(self) -> list[ControlSpec]:
        # PLACEHOLDER — verify against the official model in Phase 4.
        return [
            ControlSpec(
                name="temperature",
                label="Expressiveness",
                type="float",
                default=0.7,
                minimum=0.1,
                maximum=1.5,
                step=0.05,
                description="Verify range against the current model.",
            ),
            ControlSpec(
                name="seed",
                label="Seed",
                type="seed",
                default=0,
                description="Reproducibility, if supported by the model.",
            ),
        ]

    def load_voice(self, reference: VoiceReference) -> Any:  # pragma: no cover
        raise UpstreamError(
            "ChatterboxProvider is implemented in Phase 4 (RunPod worker). "
            "Set TTS_PROVIDER=mock for local development.",
            code="provider_not_implemented",
            status_code=501,
        )

    def generate(
        self,
        text: str,
        voice: Any,
        settings: dict[str, Any],
    ) -> GenerationResult:  # pragma: no cover
        raise UpstreamError(
            "ChatterboxProvider is implemented in Phase 4 (RunPod worker). "
            "Set TTS_PROVIDER=mock for local development.",
            code="provider_not_implemented",
            status_code=501,
        )
