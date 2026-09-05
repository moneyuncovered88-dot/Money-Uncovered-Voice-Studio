# TTS Worker (RunPod Serverless) — Phase 4

This directory will hold the GPU worker that runs **Resemble AI Chatterbox-Turbo**.
It is intentionally **not implemented in Phase 1** — per the build plan, GPU
inference comes only after the core application foundation is stable.

## Planned structure

```
services/tts-worker/
├─ Dockerfile          # CUDA base + Python + FFmpeg + Torch + Chatterbox
├─ requirements.txt    # pinned worker deps (separate from the backend pyproject)
├─ worker.py           # RunPod serverless handler (entrypoint)
├─ model.py            # load Chatterbox ONCE per worker; generate()
├─ audio.py            # output validation / format helpers
├─ storage.py          # fetch reference voice, upload generated chunk (Supabase)
├─ config.py           # env parsing
└─ tests/              # request validation, audio output, error handling
```

## Responsibilities
1. Start; load the Chatterbox model **once per worker lifecycle** (never per chunk).
2. Receive a generation request (see the contract in `docs/RUNPOD_SETUP.md`).
3. Resolve + cache the reference voice within the worker lifecycle.
4. Synthesize audio for the chunk.
5. Upload the output to Supabase Storage (private).
6. Return metadata (status, duration, sample rate, path, timing, errors).
7. Clean up temporary files.

## Before writing any code (required)
Inspect the **current** official Chatterbox implementation
(GitHub: `resemble-ai/chatterbox`) and confirm, without inventing anything:
- the exact package / model id and how the model is loaded,
- the real inference call and its **supported** parameters (e.g. exaggeration,
  cfg/guidance, temperature, seed) and their valid ranges,
- the recommended reference-audio length,
- the output sample rate and format,
- GPU/VRAM requirements and cold-start behavior,
- the license.

Reconcile the provider control specs in
`apps/api/app/services/tts/chatterbox.py` with what the model actually supports, and
record any limitations in `docs/RUNPOD_SETUP.md`. The UI shows only the controls the
provider reports, so keeping the provider honest keeps the UI honest.

## Model weights
Do not commit weights to git. Choose one of: download-on-cold-start, bake-into-image,
or RunPod network volume — and document the tradeoff (see `docs/RUNPOD_SETUP.md`).
