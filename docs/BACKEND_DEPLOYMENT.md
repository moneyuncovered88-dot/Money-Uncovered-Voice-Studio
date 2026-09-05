# Backend deployment (FastAPI)

The orchestration backend (`apps/api`) is a lightweight, always-available Python
service. **Do not deploy it to Vercel** — it is not the GPU/ML service, but it is a
long-running server, not serverless functions. Good hosts: **Railway**, **Render**,
or **Fly.io**.

It needs **FFmpeg** available at runtime (for audio assembly in a later phase). The
provided container installs it.

## Option A — Docker (recommended, portable)

A production `Dockerfile` for the backend installs FFmpeg and runs uvicorn. Build and
run:

```bash
cd apps/api
docker build -t mu-voice-api .
docker run -p 8000:8000 --env-file ../../.env mu-voice-api
```

Deploy that image to any container host.

## Option B — Railway
1. New Project → Deploy from GitHub.
2. Set **Root Directory** to `apps/api`.
3. If not using Docker, set the start command:
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   and ensure FFmpeg is available (use the Docker path if the buildpack lacks it).
4. Add environment variables (below).

## Option C — Render
1. New → **Web Service** → connect the repo.
2. **Root Directory:** `apps/api`.
3. Use the Dockerfile (recommended) so FFmpeg is present.
4. Add environment variables.

## Option D — Fly.io
1. `fly launch` inside `apps/api` (generates `fly.toml`).
2. Use the Dockerfile.
3. `fly secrets set KEY=value` for each secret; `fly deploy`.

## Environment variables

```
APP_ENV=production
LOG_LEVEL=INFO

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # secret
SUPABASE_JWT_SECRET=...              # secret

BACKEND_CORS_ORIGINS=https://your-frontend.vercel.app
BACKEND_URL=https://your-backend-domain

TTS_PROVIDER=chatterbox              # or mock in staging
MODEL_NAME=chatterbox-turbo
TTS_MAX_CHUNK_CHARS=600

RUNPOD_API_KEY=...                   # secret (GPU phase)
RUNPOD_ENDPOINT_ID=...               # GPU phase

SIGNED_URL_EXPIRY=3600
GPU_COST_PER_HOUR=0.00
```

> Never set `TTS_PROVIDER=mock` with `APP_ENV=production` — the app refuses to start
> generation in that combination on purpose.

## Health checks
Point your host's health check at `GET /health`. Optionally monitor `GET /health/tts`
to confirm RunPod configuration — neither triggers GPU inference.

## Python version
Use **Python 3.11 or 3.12**. Dependencies are declared in `apps/api/pyproject.toml`
(`pip install .`). Pin the base image (e.g. `python:3.12-slim`) for reproducibility.

## Scaling notes
This service is I/O-bound (DB, storage, RunPod calls), not CPU/GPU-bound. A small
instance is plenty; scale horizontally only if you add many concurrent users.
