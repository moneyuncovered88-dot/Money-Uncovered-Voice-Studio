"""Modal worker for MU Voice Studio — Chatterbox TTS on a free-tier GPU.

Deploy:
    pip install modal
    modal token new                       # one-time auth
    modal secret create mu-voice-tts MU_TTS_TOKEN=<a-long-random-string>
    modal deploy services/modal-worker/app.py

`modal deploy` prints the web endpoint URL. Put it in the backend as
MODAL_ENDPOINT_URL and set MODAL_TOKEN to the same random string, then set
TTS_PROVIDER=modal. See docs/MODAL_SETUP.md.

NOTE: Modal's API names drift between versions. This targets a recent release.
If `modal deploy` complains, check the commented alternatives below.
"""

from __future__ import annotations

import base64
import inspect
import io
import os
import tempfile
import time

import modal

app = modal.App("mu-voice-tts")

# chatterbox-tts pulls torch/torchaudio (CUDA wheels on Linux) + transformers.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install("chatterbox-tts", "fastapi[standard]")
)

# Shared secret the backend must send in the request body ("token").
#   modal secret create mu-voice-tts MU_TTS_TOKEN=<random>
secret = modal.Secret.from_name("mu-voice-tts")

MAX_TEXT_CHARS = 1200


@app.cls(
    image=image,
    gpu="A10G",
    secrets=[secret],
    scaledown_window=60,  # older Modal: container_idle_timeout=60
    timeout=600,
)
class TTS:
    @modal.enter()
    def load(self) -> None:
        import torch
        from chatterbox.tts import ChatterboxTTS

        self.torch = torch
        self.model = ChatterboxTTS.from_pretrained(device="cuda")
        self._sig = set(inspect.signature(self.model.generate).parameters.keys())

    def _synthesize(self, text: str, ref_path: str | None, settings: dict):
        import torchaudio

        kwargs: dict = {}
        if ref_path and "audio_prompt_path" in self._sig:
            kwargs["audio_prompt_path"] = ref_path
        for key in ("exaggeration", "cfg_weight", "temperature", "language_id"):
            val = settings.get(key)
            if val is not None and key in self._sig:
                kwargs[key] = val

        seed = int(settings.get("seed") or 0)
        if seed > 0:
            self.torch.manual_seed(seed)
            if self.torch.cuda.is_available():
                self.torch.cuda.manual_seed_all(seed)

        wav = self.model.generate(text, **kwargs)
        sr = int(getattr(self.model, "sr", 24000))
        tensor = wav.detach().to("cpu")
        if tensor.dim() == 1:
            tensor = tensor.unsqueeze(0)
        buffer = io.BytesIO()
        torchaudio.save(buffer, tensor, sr, format="wav")
        duration = round(tensor.shape[-1] / float(sr), 3)
        return buffer.getvalue(), sr, duration

    @modal.fastapi_endpoint(method="POST")  # older Modal: @modal.web_endpoint(method="POST")
    def generate(self, item: dict):
        expected = os.environ.get("MU_TTS_TOKEN", "")
        if expected and item.get("token") != expected:
            return {"status": "failed", "error": "unauthorized"}

        text = (item.get("text") or "").strip()
        if not text:
            return {"status": "failed", "error": "text is required"}
        if len(text) > MAX_TEXT_CHARS:
            return {"status": "failed", "error": "text too long"}

        ext = (item.get("voice_reference_ext") or "wav").lower().lstrip(".")
        settings = item.get("settings") or {}
        start = time.perf_counter()
        ref_path: str | None = None
        try:
            ref_b64 = item.get("voice_reference_b64")
            if ref_b64:
                fd, ref_path = tempfile.mkstemp(suffix=f".{ext}")
                with os.fdopen(fd, "wb") as fh:
                    fh.write(base64.b64decode(ref_b64))
            wav_bytes, sr, duration = self._synthesize(text, ref_path, settings)
            return {
                "status": "completed",
                "audio_b64": base64.b64encode(wav_bytes).decode("ascii"),
                "sample_rate": sr,
                "duration_seconds": duration,
                "generation_ms": int((time.perf_counter() - start) * 1000),
                "model_name": os.environ.get("MODEL_NAME", "chatterbox"),
                "error": None,
            }
        except Exception as exc:  # noqa: BLE001 - report failure to the caller
            return {"status": "failed", "error": f"generation failed: {exc}"}
        finally:
            if ref_path and os.path.exists(ref_path):
                try:
                    os.unlink(ref_path)
                except OSError:
                    pass
