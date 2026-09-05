# MU Voice Studio

**Money Uncovered Voice Studio** — a private, long-form text-to-speech narration
studio built for the [Money Uncovered](https://www.youtube.com/) YouTube channel.
It works like a lightweight, private ElevenLabs focused on one job: turning long
finance-documentary scripts into consistent, natural American narration.

> Status: **Phase 1 (Foundation)** complete — monorepo, auth, database, project /
> voice / pronunciation management, and the script-preprocessing engine. GPU
> generation (Chatterbox on RunPod) is architected but implemented in later phases.

---

## What it does (target workflow)

Paste a script → pick a narrator voice → choose a documentary preset → generate a
short preview → generate the full narration → watch real chunk-by-chunk progress →
listen → fix one bad chunk → regenerate only that chunk → rebuild → download MP3 / WAV.

---

## Architecture

```
Browser
  └─ Vercel / Next.js (App Router, TypeScript, Tailwind, shadcn-style UI)
        └─ FastAPI backend (auth, projects, preprocessing, orchestration)
              ├─ Supabase Postgres (data, RLS)
              ├─ Supabase Storage (private buckets, signed URLs)
              └─ RunPod Serverless GPU  ← Chatterbox-Turbo (Phase 4+)
                    └─ generated audio → Supabase Storage → Browser
```

- **Frontend never runs ML.** It talks only to Supabase (auth) and the FastAPI backend.
- **The backend never runs ML.** It orchestrates and dispatches GPU work to RunPod.
- **The GPU worker** (`services/tts-worker`) loads Chatterbox once per warm worker
  and synthesizes audio. It scales to zero when idle to keep cost low.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

## Tech stack

| Layer      | Choice |
|------------|--------|
| Frontend   | Next.js 16 (App Router), TypeScript, Tailwind v3, Radix/shadcn-style components |
| Backend    | Python 3.11+, FastAPI, Pydantic v2, supabase-py |
| Database   | Supabase Postgres (SQL migrations + Row Level Security) |
| Storage    | Supabase Storage (private buckets, signed URLs) |
| Auth       | Supabase Auth (email/password) |
| GPU / TTS  | RunPod Serverless + Resemble AI Chatterbox-Turbo (later phase) |
| Audio      | FFmpeg (assembly / normalization, later phase) |

## Repository structure

```
money-uncovered-voice-studio/
├─ apps/
│  ├─ web/                Next.js frontend (Vercel)
│  │  ├─ app/             App Router routes: (auth), (dashboard)
│  │  ├─ components/      UI kit + feature components
│  │  ├─ lib/             supabase clients, API client, utils
│  │  ├─ hooks/           data + debounce hooks
│  │  └─ types/           API + domain types
│  └─ api/                FastAPI orchestration backend
│     ├─ app/
│     │  ├─ api/routes/   projects, voices, pronunciations, config, health
│     │  ├─ preprocessing/ normalize, pronunciation, chunker, pipeline
│     │  ├─ services/     supabase, projects, voices, pronunciations, tts, presets
│     │  ├─ audio/        timeline math (FFmpeg assembly comes later)
│     │  ├─ schemas/      Pydantic request/response models
│     │  └─ utils/        slug / safe-filename
│     └─ tests/           pytest (pure logic)
├─ services/
│  └─ tts-worker/         RunPod GPU worker (Chatterbox) — Phase 4
├─ supabase/             (SQL migrations delivered separately, not committed)
├─ packages/shared/       shared-contract notes
├─ docs/                  setup + architecture guides
├─ .env.example
└─ pnpm-workspace.yaml
```

## Prerequisites

- **Node.js ≥ 20** and **pnpm** (`npm i -g pnpm`)
- **Python 3.11 or 3.12** recommended for the backend (3.13/3.14 may lack some wheels)
- **FFmpeg** (needed for audio assembly in a later phase; not required for Phase 1)
- A **Supabase** project (free tier is fine)
- A **RunPod** account (only needed once you reach GPU generation)

> **Windows note:** this repo is developed at a short path (e.g. `C:\mu-voice`)
> and pnpm uses a **hoisted** `node_modules` (`.npmrc: node-linker=hoisted`) to
> avoid symlink-permission errors when Windows Developer Mode is off.

## Local setup

### 1. Install frontend dependencies

```bash
pnpm install
```

### 2. Backend virtual environment

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
```

### 3. Environment variables

- Copy `.env.example` → `.env` (repo root) for the backend and worker tooling.
- Copy `apps/web/.env.local.example` → `apps/web/.env.local` for the frontend.

Fill in your Supabase values (see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)).
Leave `TTS_PROVIDER=mock` until the GPU worker phase.

### 4. Database

The SQL migrations are **not stored in this repo** — they are provided directly by
the project owner. Run them in the Supabase **SQL Editor** in order:

```
0001 schema  →  0002 RLS  →  0003 storage buckets  →  0004 profile trigger
```

See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for details.

### 5. Run it

```bash
# Terminal 1 — backend
cd apps/api
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
pnpm dev            # http://localhost:3000
```

Open http://localhost:3000, create an account, and you're in the studio.

## Verifying the build

```bash
# Frontend
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build

# Backend
cd apps/api
.venv/Scripts/python -m pytest      # (Windows path shown)
.venv/Scripts/ruff check .
```

## Generating your first narration

Full flow is documented in [`docs/VOICE_SETUP.md`](docs/VOICE_SETUP.md). In Phase 1
you can already: create an account, add a voice profile, create projects, paste and
auto-analyze scripts (word/char/duration/chunk counts), and manage your pronunciation
dictionary with live preview. Preview/full generation light up once the GPU worker
(Phase 4) and job engine (Phase 5) are in place.

## Deployment

- **Frontend → Vercel:** [`docs/VERCEL_SETUP.md`](docs/VERCEL_SETUP.md)
- **Backend → Railway / Render / Fly.io:** [`docs/BACKEND_DEPLOYMENT.md`](docs/BACKEND_DEPLOYMENT.md)
- **GPU worker → RunPod Serverless:** [`docs/RUNPOD_SETUP.md`](docs/RUNPOD_SETUP.md)
- **Supabase:** [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)

## Cost optimization

- RunPod **serverless** scales to zero when idle.
- The worker loads the model **once per warm worker**, not per chunk.
- **Preview before full generation**; **resume** partial jobs; never regenerate
  completed chunks. `GPU_COST_PER_HOUR` drives an informational cost estimate.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is **server-side only** — never shipped to the browser.
- Row Level Security scopes every table to its owner; the backend also scopes by user.
- Storage buckets are **private**; downloads use short-lived **signed URLs**.
- Uploads are validated (type/size); FFmpeg is invoked with argument arrays (no shell
  string interpolation); filenames are sanitized (no path traversal).

See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) if something misbehaves.

## License / voice rights

Only upload narrator recordings you **own or are licensed to use**. The app records
an explicit authorization confirmation with every voice. Do not clone the voices of
celebrities, creators, or other people without permission.
