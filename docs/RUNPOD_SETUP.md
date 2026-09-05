# RunPod setup (GPU worker)

RunPod runs the Chatterbox model on a GPU only when there's work, then scales to
zero. This guide assumes **no prior RunPod experience**. The worker itself is
implemented in **Phase 4** (`services/tts-worker`); this document is the deployment
runbook plus the request/response contract.

> **Do this only when you reach the GPU phase.** For Phase 1–3 keep
> `TTS_PROVIDER=mock` and skip RunPod entirely.

## 1. Create a RunPod account
Sign up at https://www.runpod.io and add billing. Serverless bills per second of GPU
time, so idle cost is near zero.

## 2. Create an API key
**Settings → API Keys → Create**. Copy it into your backend env as `RUNPOD_API_KEY`.
Treat it like a password.

## 3. Build the worker image
From `services/tts-worker` (once implemented in Phase 4):
```bash
docker build -t <your-registry>/mu-tts-worker:latest .
```
The image installs Python, FFmpeg, Torch, and Chatterbox, and defines a handler.

## 4. Push to a registry
Docker Hub, GHCR, or RunPod's registry:
```bash
docker push <your-registry>/mu-tts-worker:latest
```

## 5. Create a Serverless endpoint
**Serverless → New Endpoint**:
- **Container image:** the image you pushed
- **GPU:** start with a mid-tier GPU (e.g. 16–24 GB). Chatterbox is not huge; pick the
  cheapest GPU that generates reliably, then tune. *(Confirm VRAM needs against the
  official repo in Phase 4 — do not assume.)*
- **Container disk:** enough for the image + model weights
- **Max workers:** 1–2 to start (raise for parallel chunk generation)
- **Idle timeout:** low (e.g. 5–30 s) so workers scale down quickly
- **Flash boot / active workers:** keep 0 active for lowest cost; enable a warm worker
  only if cold starts hurt too much
- **Env vars:** anything the worker needs (model name/version, HF token if required)

Copy the **Endpoint ID** into your backend env as `RUNPOD_ENDPOINT_ID`.

## 6. Model weights strategy
Don't bake giant weights into git. Options (document your choice):
- **Download on cold start** from Hugging Face into the container — simplest, slower cold start.
- **Bake into the image** at build time — faster start, larger image.
- **RunPod network volume** — cache weights across workers; best cold-start/cost tradeoff.

Load the model **once per worker lifecycle** and cache the reference voice within the
worker — never reload per chunk.

## 7. Test the endpoint
Use RunPod's dashboard "Test" tab or:
```bash
curl -X POST https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"job_id":"t1","chunk_id":"c1","text":"Testing one two three.","voice_reference":{"path":"..."},"settings":{}}}'
```

## 8. Connect to the backend
Set in the backend env and switch the provider:
```
TTS_PROVIDER=chatterbox
RUNPOD_API_KEY=...
RUNPOD_ENDPOINT_ID=...
MODEL_NAME=chatterbox-turbo
```
Check `GET /health/tts` → `runpod_configured: true`.

## Request / response contract

This is the **actual** contract implemented by `services/tts-worker/worker.py`
and the backend's `ChatterboxProvider`. The reference audio is sent inline as
base64 (the worker stays stateless and needs no Supabase credentials); the
backend uploads the returned audio to Storage itself.

**Request (`input`)** the backend sends per chunk:
```jsonc
{
  "text": "processed chunk text",
  "voice_reference_b64": "<base64 of the reference wav/mp3>",  // may be null
  "voice_reference_ext": "wav",
  "voice_id": "uuid",            // for future conditional caching in the worker
  "settings": {                  // validated; worker forwards only kwargs the
    "exaggeration": 0.5,         // model's generate() actually accepts
    "cfg_weight": 0.5,
    "temperature": 0.8,
    "seed": 0
  },
  "output_format": "wav"
}
```

**Response** the worker returns:
```jsonc
{
  "status": "completed",         // or "failed"
  "audio_b64": "<base64 wav>",
  "sample_rate": 24000,
  "duration_seconds": 18.42,
  "generation_ms": 1234,
  "model_name": "chatterbox-turbo",
  "error": null
}
```

## Chatterbox specifics (verified against the official project)
Confirmed from the official GitHub/Hugging Face/Resemble AI sources:

- **Package:** `pip install chatterbox-tts`.
- **Model class:** `ChatterboxTurboTTS.from_pretrained(device="cuda", nano=False)`
  (350M Turbo). `nano=True` is a 110M CPU-capable variant. Weights:
  `ResembleAI/chatterbox-turbo` on Hugging Face (downloaded on first run).
- **Inference:** `model.generate(text, audio_prompt_path=..., language_id=...,
  exaggeration=0.5, cfg_weight=0.5)` returns a `torch.Tensor` at `model.sr`
  (24 kHz). Reference clip ~5–10 seconds.
- **Controls:** `exaggeration` and `cfg_weight` are documented. `temperature`
  and `seed` are **not** guaranteed in the signature — so the worker
  (`model.py`) introspects `generate()` and passes only supported kwargs, and
  seeds `torch`/`numpy` itself when a seed is given. The UI reads controls from
  `GET /api/config/voice-controls` (sourced from the provider), so it always
  reflects what's actually supported.
- **License:** MIT — commercial use, self-hosting, and shipping to production
  are allowed. Output carries Resemble's audio watermark.
- **VRAM:** Turbo is lighter than the original model (distilled 1-step decoder).
  Exact VRAM isn't published — start with a ~16 GB GPU and tune down.

If you upgrade the model version, re-check the `generate()` signature and update
`ChatterboxProvider.get_supported_controls()` if the real controls change.

## Cost tips
- Keep **idle timeout** short and **active workers** at 0.
- Generate a **preview** before committing to a full narration.
- **Resume** partial jobs; never regenerate completed chunks.
- `GPU_COST_PER_HOUR` in the backend env drives an informational cost estimate
  (`generation_seconds / 3600 × rate`). Update it when RunPod pricing changes.
