# Xenonowledge

An AI-powered "second brain" / link librarian web app. Save anything from anywhere, get
AI summaries + tags, browse with a 3D knowledge graph, and receive curated digests.

This monorepo contains:

```
app/         React + Vite + TypeScript + Tailwind + shadcn/ui frontend
supabase/    Database migrations, RLS policies, pg_cron jobs, Edge Functions (Deno)
extension/   Chrome MV3 browser extension scaffold
```

---

## 1. Quick start

```bash
# 1. install
cd app
npm install

# 2. configure env
cp .env.example .env.local
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

# 3. run frontend
npm run dev
```

For the backend you need a Supabase project. See **Section 3**.

---

## 2. Environment variables

### Frontend (`app/.env.local`)

| Var | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | Project URL from Supabase dashboard |
| `VITE_SUPABASE_ANON_KEY` | yes | Anonymous public key |
| `VITE_APP_URL` | no | Public URL of the app (used by bookmarklet) |

### Edge functions (Supabase project secrets)

Set with `supabase secrets set KEY=value`.

| Var | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Auto-injected by Supabase |
| `SUPABASE_ANON_KEY` | yes | Auto-injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Auto-injected by Supabase |
| `OPENAI_API_KEY` | one of | OpenAI API key |
| `ANTHROPIC_API_KEY` | one of | Anthropic API key (alternative provider) |
| `GEMINI_API_KEY` | one of | Google Gemini API key (alternative provider) |
| `AI_PROVIDER` | yes | `openai` \| `anthropic` \| `gemini` |
| `AI_MODEL` | no | Defaults per provider |
| `RESEND_API_KEY` | yes | For digest + auth emails |
| `RESEND_FROM` | yes | e.g. `Xenonowledge <noreply@your.domain>` |
| `TELEGRAM_WEBHOOK_SECRET` | yes | Random string used as Telegram secret_token |
| `PGSODIUM_KEY_ID` | yes | UUID of the pgsodium key used to encrypt secrets |

---

## 3. Backend setup

```bash
# install supabase cli
npm i -g supabase

# link
supabase login
supabase link --project-ref <your-ref>

# apply migrations
supabase db push

# deploy edge functions
supabase functions deploy ingest-link analyze-link ai-smart-search \
                         ai-discover telegram-webhook poll-rss \
                         send-digest generate-recommendations link-health

# seed demo data (optional, see supabase/seed.sql)
psql "$DATABASE_URL" -f supabase/seed.sql
```

The migrations enable extensions: `pgcrypto`, `pgsodium`, `vector`, `pg_cron`, `pg_net`.

---

## 4. Browser extension

The extension lives in `extension/`. To install:

1. In the app, go to **Settings → Browser Extension** and click **Generate Token**.
   Copy the token (shown once).
2. Click **Download Extension (.zip)**.
3. In Chrome: `chrome://extensions` → Developer mode → Load unpacked → select the
   unzipped folder.
4. Click the extension icon, paste your project URL + token. Done.

The bookmarklet alternative is on the same Settings page.

---

## 5. Telegram bot

In **Settings → Telegram Bot**:

1. Talk to `@BotFather`, create a bot, copy the token.
2. Paste it into the field — it is encrypted at rest with `pgsodium`.
3. Click **Activate Webhook** — the app calls Telegram's `setWebhook` pointing to
   `https://<project>.supabase.co/functions/v1/telegram-webhook` with
   `secret_token=$TELEGRAM_WEBHOOK_SECRET`.
4. Add the bot as admin to a group/channel. Every URL in any message becomes a link.

---

## 6. Project layout

```
app/
├── src/
│   ├── pages/             # Route components (Dashboard, Library, etc.)
│   ├── components/
│   │   ├── ui/            # shadcn-style primitives
│   │   ├── layout/        # Header, Sidebar, AuthGuard
│   │   ├── library/       # Library-specific components
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── graph/         # 3D knowledge graph + themes
│   │   ├── analytics/     # Heatmaps, charts
│   │   ├── settings/      # Settings sections
│   │   └── digest/
│   ├── lib/               # supabase, utils, ai, search
│   ├── hooks/             # TanStack Query hooks
│   ├── store/             # Zustand stores
│   ├── types/             # database.ts (generated), domain types
│   └── styles/
├── public/
└── package.json

supabase/
├── migrations/            # SQL migrations (schema, RLS, cron)
├── functions/             # Deno edge functions
│   ├── _shared/           # shared utils (ai client, html parse, zod)
│   ├── ingest-link/
│   ├── analyze-link/
│   ├── ai-smart-search/
│   ├── ai-discover/
│   ├── telegram-webhook/
│   ├── poll-rss/
│   ├── send-digest/
│   ├── generate-recommendations/
│   └── link-health/
└── seed.sql

extension/                 # Chrome MV3
├── manifest.json
├── src/
│   ├── background.ts
│   ├── popup.html
│   ├── popup.ts
│   └── options.html
└── icons/
```

---

## 7. Security notes

- All tables enforce Row Level Security (`owner_id = auth.uid()`).
- Sensitive secrets (Telegram bot tokens, extension tokens) are stored encrypted via
  `pgsodium`. The plaintext token is shown to the user **once**.
- Edge functions validate every request body with `zod`.
- AI provider keys live only in Supabase secrets — never in the client.

---

## 8. Deployment

Quick version:

- **Frontend** → Vercel. Import the repo, set the three `VITE_*` env vars, deploy.
  The included `vercel.json` already builds `app/` and adds the SPA rewrite.
- **Backend** → Supabase. `supabase db push` for migrations, `supabase functions deploy …` for edge functions.

See [`DEPLOY.md`](./DEPLOY.md) for the full step-by-step.

---

## 9. Scripts

```bash
# in app/
npm run dev         # vite dev server
npm run build       # production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit

# in supabase/
supabase db push
supabase functions deploy <name>
supabase functions serve <name>
```
