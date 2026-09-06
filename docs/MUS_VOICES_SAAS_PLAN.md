# MUS Voices — SaaS Roadmap & Gap Analysis

**Brand:** MUS Voices (Money Uncovered Studio Voices) · domain **musvoices.com**
Never use old names (MU Voice Studio, Money Uncovered Voice Studio, MUS Labs, etc.).

This is the working roadmap distilled from the product owner's full spec (2026-09-07).
It maps each area to what the codebase **already has**, what is **partial**, and what is
**new work**, so we build on the existing foundation instead of restarting.

---

## Current foundation (already built — reuse, don't rewrite)
- Monorepo: `apps/web` (Next.js 16 + TS + Tailwind + shadcn), `apps/api` (FastAPI), `services/modal-worker` (GPU), `services/tts-worker` (RunPod, legacy).
- Supabase Auth (ES256 JWT verified via JWKS), Postgres + RLS, private Storage buckets w/ signed URLs.
- TTS provider abstraction: `TTSProvider` / `ChatterboxProvider` / `MockTTSProvider`. Real Chatterbox on Modal GPU.
- Project workflow: create project → paste script → preprocessing (normalize, pronunciation dict, smart chunking) → preview → full generate → per-chunk retry/resume → FFmpeg assembly (pauses + loudnorm) → MP3/WAV → history.
- Voices (profiles + reference upload/clone), Pronunciation dictionary, Presets (incl. MUS Storyteller + real Speed control).
- Deployed: Vercel (web) + Railway (api) + Modal (GPU).

## Status legend: ✅ done · 🟡 partial · 🔲 new

| Area | Status | Notes |
|---|---|---|
| Brand = MUS Voices | 🟡 | Visible name changed; full sweep (README, docs, pricing/auth pages) pending |
| Light + Dark themes + toggle | 🔲 | Currently dark-only; need tokens for both + persisted toggle |
| Collapsible sidebar (persisted) | 🔲 | Current sidebar is static |
| Sidebar nav: Home/Studio/Voices/Library/Usage/Plans/Help/Settings | 🟡 | Have Dashboard/Projects/Voices/Pronunciations/History/Settings; needs rename + Usage/Plans/Help |
| Home dashboard (cards + charts) | 🟡 | Basic stat cards exist; needs charts (Recharts) + real usage data |
| Studio (project workspace) | ✅ | Strong already; polish + upload-text-file, autosave |
| Smart chunking + preprocessing | ✅ | Paragraph/sentence-aware chunker exists |
| Preview system | ✅ | Preview endpoint + panel |
| Chunk regeneration | ✅ | Per-chunk regenerate + rebuild final |
| Voices / voice profiles | ✅ | Profiles + reference clone; add search/filter |
| Library (was History) | 🟡 | History table exists; upgrade to filters/tabs/search/duplicate |
| Usage page (quotas/credits) | 🔲 | No usage ledger yet |
| Plans / pricing page | 🔲 | New |
| Help page | 🔲 | New (support form, FAQ) |
| Settings | 🟡 | Exists; expand (password, defaults, theme, delete account) |
| Freemium plans + quota enforcement | 🔲 | New: plans, usage ledger, per-plan limits |
| Abuse protection (rate limits, CAPTCHA, caps) | 🔲 | New: critical before public |
| Google AdSense (free users only) | 🔲 | New: placeholder components first |
| Stripe billing architecture | 🔲 | New: staged |
| Admin panel | 🔲 | New: role-based |
| Durable job queue (survive restarts) | 🟡 | **In progress** — background tasks die on redeploy; added stale-job reclaim + cancel; a real queue is the proper fix |
| GPU cost controls / metering | 🔲 | New |

---

## Phased build order (owner's Phases 1–8, adapted to current state)

**Phase 0 — stability:** ✅ orphaned-job reclaim + Cancel + longer timeout; GPU model baked into image (fast cold starts).

**Phase 1 — Shell & brand:** ✅ MUS Voices rename; light/dark theme toggle (persisted, no-flash); collapsible sidebar (persisted); 8-item nav (Home/Studio/Voices/Library/Usage/Plans/Help/Settings); full-width layout.

**Phase 2 — Data + usage:** ✅ plan catalog + per-plan limits; usage_service (ledger, period summary, enforcement) wired into preview/generate/voice-create; account endpoints (/usage/summary, /plans, /support/tickets); durable job self-heal on status poll. New tables (user_subscriptions, usage_ledger, support_tickets, feature_flags) delivered as chat SQL, never committed. Code fails open until the SQL is run.

**Phase 3 — Pages:** ✅ Home (plan/quota + SVG activity chart + ad slot), Library (tabs + search), Usage (real data), Plans, Help (support form). Settings expansion still pending.

**Phase 4 — Monetization & safety:** ✅ quota enforcement; abuse protection (per-plan rate limits, concurrency cap, daily generation cap, email-verify gate); optional Turnstile CAPTCHA on signup; free-user ad slots. Real AdSense units still to drop in.

**Phase 5 — Billing:** Stripe integration architecture (checkout, webhooks, plan sync) — usable even if staged.

**Phase 6 — Admin:** role-based admin (users, usage, active/failed jobs, GPU cost, abuse review, feature flags).

**Phase 7 — Polish & docs:** charts in both themes, empty/loading/error states, tests, deployment docs.

---

## Key decisions to confirm with owner
1. **GPU host:** spec says RunPod; we're currently on **Modal** (free credits, working). Keep Modal for now, keep the abstraction so RunPod stays swappable? (Recommended: yes.)
2. **Sidebar labels:** proposed one-word set (Home/Studio/Voices/Library/Usage/Plans/Help/Settings) — approve or tweak.
3. **Voice wording:** use "Voice Profile / Voice Reference" (not "cloning") in public UI for legal safety.
4. **Durable jobs:** background-task fragility needs a real fix for a public SaaS (e.g., a jobs poller/worker loop). Plan into Phase 2/5.
