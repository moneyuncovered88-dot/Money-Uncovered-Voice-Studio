# Supabase setup

Everything data-related (auth, database, storage) lives in one Supabase project.

## 1. Create a project

1. Go to https://supabase.com → **New project**.
2. Pick a name, a strong database password, and a region close to you.
3. Wait for provisioning (~2 minutes).

## 2. Get your API keys

In the dashboard: **Project Settings → API**.

| Value | Where it goes | Exposure |
|-------|---------------|----------|
| Project URL | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` | public |
| `anon` / publishable key | `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (browser) |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **secret — backend only** |
| JWT Secret (JWT Settings) | `SUPABASE_JWT_SECRET` | **secret — backend only** |

> The backend verifies access tokens locally using the **JWT Secret** (HS256). If
> your project uses only the newer asymmetric signing keys, reveal/enable the legacy
> JWT secret under **JWT Settings**, or switch the backend to remote verification.

Never expose `service_role` or the JWT secret to the browser.

## 3. Run the migrations (in order)

Open **SQL Editor** in the dashboard and run each file's contents, in this order:

1. `supabase/migrations/0001_init.sql` — enums, tables, indexes, `updated_at` triggers
2. `supabase/migrations/0002_rls.sql` — Row Level Security policies
3. `supabase/migrations/0003_storage.sql` — private buckets + object policies
4. `supabase/migrations/0004_profile_trigger.sql` — auto-create a profile per new user

**Order matters** — RLS and storage policies reference tables created in `0001`.

> Prefer the CLI? Install the Supabase CLI, `supabase link` your project, drop these
> files into your local `supabase/migrations`, and `supabase db push`.

### Verify

In **Table Editor** you should see: `profiles`, `voice_profiles`, `projects`,
`project_chunks`, `generation_jobs`, `pronunciation_entries`. Each should show RLS
**enabled**.

## 4. Configure Auth

**Authentication → Providers → Email**: enable **Email**. For a private single-user
tool you can turn **Confirm email** off for convenience, or leave it on (the app
handles the confirmation redirect at `/auth/callback`).

**Authentication → URL Configuration**: set your **Site URL**
(e.g. `http://localhost:3000` for dev, your Vercel URL in prod) and add both to
**Redirect URLs**.

Create your account from the app's `/signup` page.

## 5. Storage buckets

`0003_storage.sql` already creates three **private** buckets:
`voice-references`, `generated-chunks`, `final-audio`. Confirm them under **Storage**.
They must **not** be public — the backend issues signed URLs for downloads.

## 6. Test the connection

```bash
# Backend health (should report supabase_configured: true once env is set)
curl http://localhost:8000/health
```

Then sign up in the web app; a row should appear in `profiles` automatically
(via the `0004` trigger).

## Environment recap

Backend `.env` (repo root):
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
```

Frontend `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```
