# TTS Worker (RunPod Serverless) — Chatterbox-Turbo

GPU worker that runs **Resemble AI Chatterbox-Turbo** (MIT license). The backend
dispatches one chunk per request; the model is loaded **once per warm worker**.

## Files
```
config.py        env config (device, nano, model name, max text)
request.py       pure request parsing/validation (unit-tested)
model.py         loads ChatterboxTurboTTS once; signature-filtered generate()
audio.py         torch waveform -> WAV bytes
worker.py        RunPod serverless handler (entrypoint)
Dockerfile       CUDA/PyTorch base + ffmpeg + chatterbox-tts + runpod
requirements.txt chatterbox-tts, runpod
tests/           request-validation tests (run without a GPU)
```

## Contract
See `docs/RUNPOD_SETUP.md` for the exact request/response JSON. In short: the
backend sends `text`, the reference audio as base64, and validated `settings`;
the worker returns `audio_b64` (WAV) + `sample_rate` + `duration_seconds`.

`model.py` introspects the real `generate()` signature and forwards only the
kwargs the installed model version accepts — so unsupported controls are never
sent. Confirmed controls: `exaggeration`, `cfg_weight`. Optional (best-effort):
`temperature`, `seed`.

## Run the pure tests (no GPU needed)
```bash
cd services/tts-worker
python -m pytest
```

## Build & deploy
Follow `docs/RUNPOD_SETUP.md`. Before the first build, **verify** the Dockerfile
base image tag matches your GPU's CUDA and that `chatterbox-tts` doesn't fight
the base image's torch build (comments in the Dockerfile explain the options).
Model weights download from Hugging Face on cold start — use a RunPod network
volume (`HF_HOME`) or bake them in to speed cold starts.
