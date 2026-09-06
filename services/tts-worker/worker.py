"""RunPod serverless entrypoint for MUS Voices TTS.

Request  (job["input"]): see request.GenRequest and docs/RUNPOD_SETUP.md.
Response: {status, audio_b64, sample_rate, duration_seconds, generation_ms,
           model_name, error}
"""

from __future__ import annotations

import base64
import os
import tempfile
import time
from typing import Any

import runpod

import audio as audio_utils
import model as tts_model
from config import MODEL_NAME
from request import parse_input


def _write_reference(b64: str | None, ext: str) -> str | None:
    if not b64:
        return None
    data = base64.b64decode(b64)
    fd, path = tempfile.mkstemp(suffix=f".{ext}")
    with os.fdopen(fd, "wb") as fh:
        fh.write(data)
    return path


def handler(job: dict[str, Any]) -> dict[str, Any]:
    start = time.perf_counter()
    try:
        req = parse_input(job.get("input") or {})
    except ValueError as exc:
        return {"status": "failed", "error": str(exc)}

    ref_path: str | None = None
    try:
        ref_path = _write_reference(req.voice_reference_b64, req.voice_reference_ext)
        wav, sample_rate = tts_model.generate(req.text, ref_path, req.settings)
        wav_bytes = audio_utils.tensor_to_wav_bytes(wav, sample_rate)
        return {
            "status": "completed",
            "audio_b64": base64.b64encode(wav_bytes).decode("ascii"),
            "sample_rate": int(sample_rate),
            "duration_seconds": audio_utils.duration_seconds(wav, sample_rate),
            "generation_ms": int((time.perf_counter() - start) * 1000),
            "model_name": MODEL_NAME,
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001 - report any failure back to the caller
        return {"status": "failed", "error": f"generation failed: {exc}"}
    finally:
        if ref_path and os.path.exists(ref_path):
            try:
                os.unlink(ref_path)
            except OSError:
                pass


# Warm the model at cold start so the first request isn't the slowest.
try:
    tts_model.get_model()
except Exception as exc:  # pragma: no cover - defer to first request on failure
    print(f"[warn] model preload deferred: {exc}")

runpod.serverless.start({"handler": handler})
