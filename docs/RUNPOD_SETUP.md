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

**Request (`input`)** the backend sends per chunk:
```jsonc
{
  "job_id": "uuid",
  "chunk_id": "uuid",
  "text": "processed chunk text",
  "voice_reference": { "storage_path": "voice-references/<user>/<voice>.wav" },
  "settings": { /* validated, provider-supported controls only */ },
  "model_name": "chatterbox-turbo",
  "output_format": "wav"
}
```
The backend passes **secure storage references** (short-lived signed URL or path the
worker resolves with its own credentials), not public URLs.

**Response** the worker returns:
```jsonc
{
  "status": "completed",           // or "failed"
  "chunk_id": "uuid",
  "audio_path": "generated-chunks/<user>/<project>/<index>.wav",
  "duration_seconds": 18.42,
  "sample_rate": 24000,
  "generation_ms": 1234,
  "model_name": "chatterbox-turbo",
  "error": null
}
```

## Chatterbox specifics — verify in Phase 4
Before writing worker code, inspect the **current** official implementation
(GitHub: `resemble-ai/chatterbox`) and confirm: the pip package / model id, exact
inference call, the **real** supported controls (e.g. exaggeration, cfg/guidance,
temperature, seed), the reference-audio length it recommends, the output sample
rate, GPU/VRAM requirements, and the license. **Only expose controls the model
actually supports** — the UI reads them from `GET /api/config/voice-controls`, which
is sourced from the provider, so it will reflect reality automatically. Record any
limitations you discover back into this file.

## Cost tips
- Keep **idle timeout** short and **active workers** at 0.
- Generate a **preview** before committing to a full narration.
- **Resume** partial jobs; never regenerate completed chunks.
- `GPU_COST_PER_HOUR` in the backend env drives an informational cost estimate
  (`generation_seconds / 3600 × rate`). Update it when RunPod pricing changes.
