# VetNow

Live veterinary availability and booking for Visakhapatnam. Pet owners can see
which vets are available right now, get an AI-structured triage of their concern,
and book a clinic, video, or home consultation.

## Live environments

| What                | Where                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| App                 | https://vet-connect.up.railway.app/ (Railway service `vet-connect`, Hobby plan)  |
| Code                | https://github.com/rahulpalivela18/vet-application (`main` branch, auto-deploys) |
| DB prod             | Supabase Cloud project `vetnow` — `https://gsisrnnkasxwvtttwefp.supabase.co`     |
| DB dev              | Supabase Cloud project `vetnow-dev` — `https://oiyqysoaqmzzgyigoclt.supabase.co` |
| Google OAuth client | `541059837181-12nk3hjkuohgnund0iqqic840nibkrbq.apps.googleusercontent.com`       |

No secrets are stored in this repo. Keys live in local `.env` (gitignored) and in
Railway service variables. See `.env.example` for the full variable list.

## Stack

- **App**: TanStack Start + React 19 + TypeScript + Vite 8 (requires **Node >= 22**)
- **UI**: Tailwind CSS v4, shadcn/ui (Radix), TanStack Router + Query, React Hook Form + Zod
- **Backend**: Supabase Cloud — Postgres + Auth + PostgREST + Row Level Security.
  No self-hosting, no edge functions, no storage usage (as of now).
- **AI assistant**: OpenAI-compatible gateway via Vercel AI SDK
  (`src/lib/ai-gateway.server.ts`, default OpenRouter). **Not configured yet** —
  `AI_GATEWAY_*` vars are unset, so the assistant route errors until a key is added.
- **Hosting**: Railway (Nixpacks). `railway.toml` sets build
  (`npm install && npm run build`) and start (`node .output/server/index.mjs`,
  Nitro `node-server` preset).
- **Package manager**: npm (`package-lock.json` committed). Bun was removed.

## Architecture

- `src/routes/` — pages: `/` (home), `/find`, `/assistant`, `/auth`, `/book.$vetId`,
  `/emergency`, `/for-vets`, `/vets.$vetId`, plus authenticated `/dashboard` and
  `/vet-console` (guarded by `src/routes/_authenticated/route.tsx`).
- `src/lib/*.functions.ts` — server functions (`pets`, `vets`, `vet-hours`,
  `appointments`, `account`, `assistant`). Protected ones use the
  `requireSupabaseAuth` middleware (`src/integrations/supabase/auth-middleware.ts`),
  which validates the Supabase JWT and injects a user-scoped client + `userId`.
  A client middleware (`auth-attacher.ts`) attaches the bearer token to server calls.
- `src/integrations/supabase/` — browser client (`client.ts`), service-role admin
  client (`client.server.ts`, bypasses RLS — server only), auth middleware.
- **Auth flows**: email/password via Supabase Auth; Google OAuth via
  `supabase.auth.signInWithOAuth({ provider: "google" })` with
  `redirectTo: <origin>/auth`. Session handled by the Supabase client
  (`src/hooks/use-session.ts`).
- **Database**: schema + RLS + triggers in `supabase/migrations/` — **5 files, all
  non-empty, applied oldest-to-newest and tracked via `supabase_migrations.schema_migrations`**.
  Tables: `profiles`, `user_roles`,
  `clinics`, `vets`, `pets`, `appointments`, `vet_working_hours`, `reviews`,
  plus enums (`app_role`, `vet_status`, `verification_state`, `appointment_status`)
  and the `handle_new_user()` trigger (auto-creates profile/role on signup).
  Google-OAuth users get a profile but no role row (no role chosen at OAuth time);
  the app treats role-less users as owners.

## Environment variables

Local `.env` (gitignored) points at **dev**; prod keys sit commented as backup:

```
SUPABASE_PROJECT_ID=             # dev project ref
SUPABASE_URL=                    # dev project URL locally
SUPABASE_PUBLISHABLE_KEY=        # dev anon key
SUPABASE_SERVICE_ROLE_KEY=       # dev service_role key (server only, never expose)
VITE_SUPABASE_PROJECT_ID=        # same ref (client bundle needs VITE_ prefix)
VITE_SUPABASE_URL=               # same URL
VITE_SUPABASE_PUBLISHABLE_KEY=   # same anon key
AI_GATEWAY_BASE_URL=             # unset for now (defaults to OpenRouter)
AI_GATEWAY_API_KEY=              # unset for now
AI_GATEWAY_MODEL=                # unset for now (defaults to google/gemini-2.5-flash)
```

Railway `vet-connect` service variables hold the **prod** equivalents (the same
Supabase vars, no AI vars yet) plus the critical build var below.

## Development workflow

```sh
npm install
npm run dev        # serves on http://localhost:8080
npm run build      # production build (Nitro node-server → .output/)
npm start          # run the built server
npm run lint       # ESLint (repo has pre-existing Prettier drift — untouched files fail; only touched files are kept clean)
```

- **Dev vs prod rule**: develop only against `vetnow-dev`. Prod keys never go in
  local `.env` uncommented and never touch prod from your laptop.
- **Schema changes**: create a new dated migration with the Supabase CLI, apply it
  to dev, then merge to `main` and the prod GitHub integration applies it. See
  [Database migrations](#database-migrations). Never edit an applied migration.
- **Google OAuth setup** (per Supabase project): Auth → Providers → Google →
  Client ID + Secret; callback URL pattern is
  `<project-url>/auth/v1/callback`; that URL must ALSO be registered in Google
  Cloud Console → Credentials → OAuth client → Authorized redirect URIs.
  Prod URL config: Site URL = app domain, redirect allow-list includes
  `http://localhost:8080/**` and `https://vet-connect.up.railway.app/**`.
  Confirm-email is ON in prod, OFF in dev (deliberate, for frictionless testing).

## Database migrations

Migrations live in `supabase/migrations/` and are applied by the Supabase CLI
(dev) and the native Supabase GitHub integration (prod). Nothing is pasted into
the dashboard SQL editor anymore, and the remote `supabase_migrations.schema_migrations`
table records exactly what has run.

### One-time setup (local, for dev)

```sh
brew install supabase/tap/supabase      # or: npm i -D supabase && npx supabase ...
supabase login
supabase link --project-ref oiyqysoaqmzzgyigoclt   # vetnow-dev
```

The 5 existing migrations were originally applied by hand, so the dev history is
empty. Mark them applied so the CLI does not re-run them:

```sh
for v in 20260825055814 20260825055832 20260904153343 20260907094936 20260907095007; do
  supabase migration repair --status applied "$v"
done
```

### Making a change

```sh
supabase migration new add_something   # creates supabase/migrations/<ts>_add_something.sql
# write the SQL and run it against a local stack if you want to test it
supabase db push                       # applies pending migrations to vetnow-dev
```

Commit the new file. Never edit an already-applied migration — add a new one.

### Prod (automated)

In the Supabase dashboard for the `vetnow` project: **Project Settings →
Integrations → GitHub**, connect `rahulpalivela18/vet-application`, point the
working directory at the repo root (where `supabase/` lives), and enable deploy
on push for `main`. After that, any migration merged to `main` is applied to prod
automatically.

**Baseline prod first (once).** Because prod was also seeded by hand, its history
is empty and the integration would try to re-run all 5 files. Repair prod the
same way before enabling the integration:

```sh
supabase link --project-ref gsisrnnkasxwvtttwefp   # vetnow (prod) — baseline only
# run the same migration repair loop as above
supabase link --project-ref oiyqysoaqmzzgyigoclt   # relink back to dev
```

Only the migration-history table is written during repair — no schema changes.

## Railway deployment notes (gotchas already hit)

- **Node version**: deps require **Node >= 22**. Railway/Nixpacks historically
  defaulted to Node 18, so `engines: >=22` plus the `NIXPACKS_NODE_VERSION=22`
  service variable were added. It currently builds on Node 24; the `>=22` constraint
  is what matters. If a deploy fails, check the Node version line in the build log.
- **`startCommand` must live under `[deploy]`, never `[build]`.** Railway ignores it
  under `[build]`, then Nixpacks falls back to its staticfile provider and runs
  **caddy** instead of the Node server — every request 404s instantly at the proxy
  (green build, `Server: Caddy`, sub-millisecond 404s), and the service dies after
  `healthcheckTimeout`. Confirm the build plan shows
  `start │ node .output/server/index.mjs`.
- `railway.toml` sets `healthcheckPath = "/healthz"` — a DB-free route handled in
  `src/server.ts` that returns `200 ok` before SSR. The old `/` healthcheck hit the
  DB, so any Supabase hiccup failed the check and Railway marked the deployment
  unhealthy. If a deploy still fails, verify the healthcheck URL responds first.
- `SecretsUsedInArgOrEnv` / `UndefinedVar` lines in build logs are warnings only.
- Deploys trigger on every push to `main`.

## Decision history (why things are this way)

- **Left Lovable**: removed `@lovable.dev/*` deps, telemetry, preview-auth broker,
  Lovable AI gateway, `.lovable/`, `AGENTS.md`. Google login reimplemented with
  native Supabase OAuth.
- **Bun → npm**: Bun wasn't installed; npm + `package-lock.json` now canonical.
- **Rejected self-hosted Supabase on Railway** (community template: 10 services,
  too costly/complex for the $5 plan) **and** a plain-Postgres rewrite (would mean
  rebuilding auth + all ~60 queries). Chose Supabase Cloud free tier for both
  prod and dev instead — zero code changes.
- **Build retargeted** from Cloudflare Workers to Node (`nitro({ preset:
"node-server" })`, custom `vite.config.ts`) for Railway.
- **AI provider**: OpenRouter chosen but not yet wired with a key.
- **Migrations moved off the SQL editor**: Supabase CLI tracks applied migrations
  (`supabase_migrations.schema_migrations`) on dev; the native GitHub integration
  auto-applies them to prod on push to `main`.

## Pending / known gaps

- **AI assistant — Phase 2 (deferred).** `AI_GATEWAY_API_KEY` (OpenRouter) is unset
  locally and on Railway, so `/assistant` errors until a key is added. When picking
  this up: set `AI_GATEWAY_*` locally, add the same vars to the Railway service, then
  test the assistant end-to-end.
- **Repo-wide `npm run lint` reports pre-existing Prettier drift** in untouched
  files. Format on touch (`npx prettier --write <file>`) rather than one big reformat.

### Verified working

- Railway prod deploy (`vet-connect.up.railway.app`) is green on Node 24, 1 replica,
  US West — `GET /healthz` → `200`, `/` and `/find` → `200`.
- Google OAuth click-through works on the live URL.
- Migrations baselined on both projects (`supabase migration list` shows local =
  remote for all 5) and the prod GitHub integration is enabled.
