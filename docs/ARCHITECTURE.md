# Architecture

MU Voice Studio is a small, replaceable-parts system. Each tier has one job and a
clean boundary, so the TTS engine (and later, multi-user SaaS) can change without a
rewrite.

## Components

### Frontend — `apps/web` (Vercel)
Next.js App Router. Handles auth UI, the studio dashboard, script editing, and
playback. It talks to **Supabase** (auth session) and to the **FastAPI backend**
(everything else). It never performs ML inference.

- `app/(auth)/*` — login / signup (Supabase Auth, email + password)
- `app/(dashboard)/*` — protected shell + pages (dashboard, projects, voices,
  pronunciations, history, settings)
- `proxy.ts` — refreshes the Supabase session and gates routes on every request
- `lib/api.ts` — authenticated fetch client; attaches the Supabase access token as
  a Bearer header to every backend call

### Backend — `apps/api` (Railway / Render / Fly.io)
FastAPI. Verifies the Supabase JWT locally (HS256), owns all business logic, and
orchestrates generation. Uses the Supabase **service role** key, so **every query is
scoped by the authenticated user id** (defense in depth alongside RLS).

Responsibilities: auth verification, project/voice/pronunciation CRUD, script
preprocessing + chunking, RunPod dispatch (later), status tracking, audio assembly
(later), storage + signed URLs.

### GPU worker — `services/tts-worker` (RunPod Serverless) — Phase 4
Loads Chatterbox **once per warm worker**, receives a chunk request, synthesizes
audio, uploads it, and returns metadata. Scales to zero when idle.

### Data + storage — Supabase
Postgres (with RLS) for all records; private Storage buckets for voice references,
generated chunks, and final audio, accessed via signed URLs.

## Request → audio flow (target)

```
1. User edits a project and clicks Generate.
2. Frontend → POST /api/projects/{id}/generate  (Bearer token)
3. Backend verifies JWT, preprocesses the script, creates a generation_job and chunks.
4. Backend dispatches each chunk to RunPod (warm worker, model already loaded).
5. Worker synthesizes → uploads chunk audio → returns duration/sample-rate/path.
6. Backend updates chunk + job progress; frontend polls GET /api/projects/{id}/status.
7. When all chunks are done: FFmpeg assembles → normalizes → encodes MP3/WAV.
8. Backend stores final audio + chunk timeline; frontend plays and downloads via signed URLs.
```

## Preprocessing pipeline (`apps/api/app/preprocessing`)

Pure, deterministic, dependency-free (fully unit-tested):

```
raw script
  → normalize whitespace
  → normalize punctuation (unicode → ASCII the model reads reliably)
  → strip stage directions ([PAUSE], [SECTION], …)
  → handle headings (drop unless "speak headings" is on)
  → apply pronunciation dictionary (longest term first, boundary-safe)
  → split into sentences (guards decimals, money, abbreviations)
  → pack into chunks on natural boundaries (paragraph → sentence → clause → word)
```

Chunk size is bounded by `TTS_MAX_CHUNK_CHARS` (default 600, tune with Chatterbox).
The **original script is always preserved**; processed text is stored separately.

## Long-form consistency

Every chunk of a project uses the **same voice reference, model, and settings
snapshot**. Generation settings are snapshotted per project/job so changing global
defaults later never alters historical projects. Seeds are exposed only if the model
supports them.

## Timeline metadata (subtitles later)

On assembly we store each chunk's `start_time_seconds` / `end_time_seconds` /
`duration_seconds` (`app/audio/timeline.py`). This chunk-level timing is enough to
drive subtitle and scene-timestamp generation later; word-level timing would require
forced alignment and is out of scope for the MVP.

## State machine

`generation_status`: `draft → queued → preprocessing → generating → assembling →
normalizing → uploading → completed` (or `failed` / `cancelled`). Transitions are
validated so impossible states (e.g. `completed` with no final audio) can't occur.
Chunks: `waiting → queued → generating → generated` (or `failed`).

## TTS provider abstraction

`app/services/tts/base.py` defines `TTSProvider`:
`get_supported_controls()`, `validate_settings()`, `load_voice()`, `generate()`.

- `MockTTSProvider` — real, GPU-free; returns a valid WAV sized to the text. For dev.
- `ChatterboxProvider` — dispatches to the RunPod worker (Phase 4).

Swap providers via `TTS_PROVIDER`. Adding XTTS / Kokoro / OpenAI TTS / ElevenLabs /
Cartesia later means implementing one class — no orchestration changes.

## Why these boundaries

- Vercel is great for the UI but wrong for GPU/ML → ML lives on RunPod.
- The FastAPI backend is a cheap always-available orchestrator → keeps GPU cold when idle.
- Supabase gives us Postgres + Auth + Storage + RLS with minimal ops.
