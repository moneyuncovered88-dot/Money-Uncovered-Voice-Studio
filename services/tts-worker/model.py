"""Chatterbox-Turbo model loading + generation.

The model is loaded ONCE per worker lifecycle (warm workers reuse it). We
introspect the real `generate()` signature and only pass parameters the
installed model version actually supports — so we never send invented kwargs.
"""

from __future__ import annotations

import inspect
import threading
from typing import Any

import torch

from config import DEVICE, NANO

# Import path per the official package (chatterbox-tts). If a future release
# moves the class, adjust here — do not guess silently.
try:
    from chatterbox.tts import ChatterboxTurboTTS  # type: ignore
except Exception:  # pragma: no cover - import surface varies by version
    from chatterbox import ChatterboxTurboTTS  # type: ignore

_model: Any = None
_lock = threading.Lock()


def get_model() -> Any:
    """Return the singleton model, loading it on first use (thread-safe)."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                _model = ChatterboxTurboTTS.from_pretrained(device=DEVICE, nano=NANO)
    return _model


def _supported(model: Any) -> set[str]:
    try:
        return set(inspect.signature(model.generate).parameters.keys())
    except (TypeError, ValueError):
        return set()


def generate(text: str, ref_path: str | None, settings: dict[str, Any]) -> tuple[Any, int]:
    """Synthesize speech; return (waveform_tensor, sample_rate)."""
    model = get_model()
    sig = _supported(model)

    kwargs: dict[str, Any] = {}
    if ref_path and "audio_prompt_path" in sig:
        kwargs["audio_prompt_path"] = ref_path

    # Only forward controls the model truly accepts.
    for key in ("exaggeration", "cfg_weight", "temperature", "language_id"):
        value = settings.get(key)
        if value is not None and key in sig:
            kwargs[key] = value

    # Reproducibility, if a seed was requested.
    seed = int(settings.get("seed") or 0)
    if seed > 0:
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        try:
            import numpy as np

            np.random.seed(seed)
        except Exception:
            pass

    wav = model.generate(text, **kwargs)
    return wav, int(getattr(model, "sr", 24000))
