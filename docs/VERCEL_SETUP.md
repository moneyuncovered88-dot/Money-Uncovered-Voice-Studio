# Vercel setup (frontend)

The Next.js app in `apps/web` deploys to Vercel. The backend and GPU worker deploy
elsewhere (see their guides).

## 1. Import the repository
1. Push this repo to GitHub.
2. In Vercel → **Add New → Project** → import the repo.

## 2. Configure the project
- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js (auto-detected)
- **Install Command:** `pnpm install` (Vercel detects pnpm from the lockfile)
- **Build Command:** `next build` (default)
- **Output:** default

> Because the Root Directory is `apps/web`, Vercel builds only the frontend.

## 3. Environment variables
Add these under **Settings → Environment Variables** (Production + Preview):

```
NEXT_PUBLIC_SUPABASE_URL       = https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon key>
NEXT_PUBLIC_API_URL            = https://<your-backend-domain>
```

Only `NEXT_PUBLIC_*` values are exposed to the browser — never add the service role
key or JWT secret here.

## 4. Deploy
Trigger a deploy. Vercel gives you a `*.vercel.app` URL.

## 5. Wire up the other services
- In **Supabase → Authentication → URL Configuration**, add your Vercel URL as the
  **Site URL** and to **Redirect URLs** (so email confirmation / magic links return
  correctly).
- On your **backend**, add the Vercel URL to `BACKEND_CORS_ORIGINS`.

## 6. Custom domain (optional)
**Settings → Domains → Add** your domain and follow the DNS instructions. Update the
Supabase URL config and backend CORS to match.

## Notes
- The app reaches the backend at `NEXT_PUBLIC_API_URL` from the browser, so that URL
  must be publicly reachable and CORS-allowed.
- `proxy.ts` (route protection) runs on Vercel's Edge automatically.
