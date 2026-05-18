# Deploying Xenonowledge

The frontend (in `app/`) is a static SPA built with Vite — perfect for Vercel.
The backend (Supabase migrations + edge functions + cron jobs) lives on Supabase.

```
┌──────────────────┐         ┌─────────────────────────┐
│  Vercel (SPA)    │ ──────► │  Supabase (Postgres,    │
│  app/dist        │  HTTPS  │  Auth, Storage, Edge    │
│                  │         │  Functions, pg_cron)    │
└──────────────────┘         └─────────────────────────┘
```

---

## 1. Deploy the frontend to Vercel

### Option A — One-click via the dashboard

1. Push this repo to GitHub (already done if you came from the PR).
2. Go to https://vercel.com/new and import the repo.
3. **Root Directory:** leave as `/` (the included `vercel.json` knows about `app/`).
4. **Framework Preset:** "Other" (the JSON tells Vercel everything it needs).
5. Add environment variables (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://<your-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your anon key>`
   - `VITE_APP_URL` = `https://<your-vercel-domain>`
6. Click **Deploy**. Done.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link        # from repo root
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_APP_URL
vercel --prod
```

The provided `vercel.json` handles:
- Building from the `app/` subdirectory (`cd app && npm install && npm run build`).
- Serving from `app/dist`.
- SPA fallback rewrite so `/library/:linkId`, `/u/:username`, etc. don't 404.
- 1-year immutable cache for `/assets/*` (Vite's hashed bundles).

After Supabase is deployed (next section), update Supabase **Authentication →
URL Configuration** to add your Vercel domain to "Site URL" and "Redirect URLs"
so that email confirmation + password reset links work.

---

## 2. Deploy the backend to Supabase

Vercel cannot run Postgres or pg_cron, so the backend stays on Supabase.

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-ref>

# 1) Apply migrations (schema, RLS, triggers, cron)
supabase db push

# 2) Set secrets used by edge functions
supabase secrets set \
  AI_PROVIDER=openai \
  OPENAI_API_KEY=sk-... \
  RESEND_API_KEY=re_... \
  RESEND_FROM='Xenonowledge <noreply@your-domain.com>' \
  TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)

# 3) Deploy each edge function
supabase functions deploy ingest-link analyze-link ai-smart-search \
                         ai-discover telegram-webhook poll-rss \
                         send-digest generate-recommendations link-health
```

The `pg_cron` jobs in `migrations/0004_cron_jobs.sql` reference two settings
that Supabase needs to know about so cron-invoked HTTP calls authenticate:

```sql
alter database postgres set "app.settings.supabase_url" = 'https://<your-ref>.supabase.co';
alter database postgres set "app.settings.service_role_key" = '<your service role key>';
```

(Run this once in the SQL editor — these are read by the cron job bodies.)

---

## 3. Domains & email

- **Custom domain on Vercel:** Project → Settings → Domains → add yours.
- **Resend:** verify the sending domain so digest emails don't go to spam.
- **Supabase auth emails:** in the Auth settings, set `Site URL` to your final
  Vercel domain so confirmation links land on your live app.

---

## 4. CI sanity check (optional)

Before pushing to Vercel for the first time, you can run the build locally to
confirm the bundle works:

```bash
cd app
npm install
npm run typecheck
npm run build
npm run preview   # visit http://localhost:4173
```

---

## 5. Common gotchas

| Symptom | Fix |
| --- | --- |
| `404` on `/library/abc` after refresh | Make sure `vercel.json` rewrites are deployed (they are by default in this repo). |
| Sign-in works but redirects to localhost | Add the Vercel domain to Supabase **Auth → URL Configuration**. |
| Edge function calls return CORS errors | The bundled functions all return `Access-Control-Allow-Origin: *`. If you change that, also allow your Vercel domain explicitly. |
| `chrome.storage` empty in extension | Open the extension's options page, paste `VITE_SUPABASE_URL` + a freshly generated extension token. |
| `pg_cron` rows not running | Run the two `alter database … set` statements above; Supabase requires them in the SQL editor (they don't survive `db reset`). |

---

That's the entire deploy path: **Vercel for the SPA, Supabase for the rest**.
