# Troubleshooting

## Setup / install

**`pnpm install` fails with `EPERM: symlink` on Windows**
pnpm's default store uses symlinks, which need Developer Mode or admin. This repo
sets `node-linker=hoisted` in `.npmrc` to avoid it. Ensure that file exists, then
`pnpm install` again. Also keep the repo at a **short path** (e.g. `C:\mu-voice`) to
avoid Windows' 260-char path limit.

**Backend `pip install` fails building `pydantic-core` (or similar)**
You're likely on a brand-new Python (3.13/3.14) that lacks prebuilt wheels. Use
**Python 3.11 or 3.12** for the backend.

**`ffmpeg: command not found`**
Install FFmpeg and ensure it's on `PATH` (needed for audio assembly, a later phase).
The backend Docker image installs it automatically.

## Auth

**Every page redirects to `/login`**
The proxy couldn't find a valid session. Causes: Supabase env not set / wrong values,
or you're not signed in. Check `apps/web/.env.local` and that the Supabase project is
reachable.

**Backend returns 401 `unauthorized` / "Server auth is not configured"**
Set `SUPABASE_JWT_SECRET` (Supabase → Settings → API → JWT Settings). The backend
verifies tokens locally with it (HS256). If your project uses only asymmetric keys,
enable the legacy JWT secret.

**Login says "Unable to reach the authentication service"**
The frontend can't reach Supabase. Verify `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and your network.

## API / data

**Backend 502 `supabase_not_configured`**
Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend env.

**Empty dashboard / "Database error"**
Run all four migrations in order (see `SUPABASE_SETUP.md`). Confirm the six tables
exist and RLS is enabled.

**CORS errors in the browser console**
Add your frontend origin to `BACKEND_CORS_ORIGINS` (comma-separated) and restart the
backend.

**New user has no profile row**
The `0004_profile_trigger.sql` migration wasn't applied. Apply it; it auto-creates a
`profiles` row on signup.

## Generation (later phases)

**`provider_not_implemented` (501)**
`TTS_PROVIDER=chatterbox` but the RunPod worker isn't built/connected yet. Use
`TTS_PROVIDER=mock` for development, or complete `RUNPOD_SETUP.md`.

**App refuses to start generation in production**
`TTS_PROVIDER=mock` with `APP_ENV=production` is blocked by design. Set
`TTS_PROVIDER=chatterbox` in production.

**`GET /health/tts` shows `runpod_configured: false`**
Set `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID`.

## Verifying a healthy stack

```bash
curl http://localhost:8000/health         # {"status":"ok", ...}
curl http://localhost:8000/health/tts     # provider/model/runpod status
pnpm --filter web build                   # frontend builds
cd apps/api && .venv/Scripts/python -m pytest   # backend tests pass
```
