# VetNow

Live veterinary availability and booking for Visakhapatnam. Pet owners can see
which vets are available right now, get an AI-structured triage of their concern,
and book a clinic, video, or home consultation.

## Live environments

| What     | Where                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| App      | https://vet-connect.up.railway.app/ (Railway service `vet-connect`, Hobby plan)        |
| Code     | https://github.com/rahulpalivela18/vet-application (`main` branch, auto-deploys)       |
| DB prod  | Supabase Cloud project `vetnow` — `https://gsisrnnkasxwvtttwefp.supabase.co`           |
| DB dev   | Supabase Cloud project `vetnow-dev` — `https://oiyqysoaqmzzgyigoclt.supabase.co`       |
| Google OAuth client | `541059837181-12nk3hjkuohgnund0iqqic840nibkrbq.apps.googleusercontent.com` |

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
  non-empty, applied oldest-to-newest**. Tables: `profiles`, `user_roles`,
  `clinics`, `vets`, `pets`, `appointments`, `vet_working_hours`, `reviews`,
  plus enums (`app_role`, `vet_status`, `verification_state`, `appointment_status`)
  and the `handle_new_user()` trigger (auto-creates profile/role on signup).
  Google-OAuth users get a profile but no role row (no role chosen at OAuth time);
  the app treats role-less users as owners.

## Environment variables

Local `.env` (gitignored) points at **dev**; prod keys sit commented as backup:

```
SUPABASE_URL=                    # dev project URL locally
SUPABASE_PUBLISHABLE_KEY=        # dev anon key
SUPABASE_SERVICE_ROLE_KEY=       # dev service_role key (server only, never expose)
VITE_SUPABASE_URL=               # same URL (client bundle needs VITE_ prefix)
VITE_SUPABASE_PUBLISHABLE_KEY=   # same anon key
AI_GATEWAY_BASE_URL=             # unset for now (defaults to OpenRouter)
AI_GATEWAY_API_KEY=              # unset for now
AI_GATEWAY_MODEL=                # unset for now (defaults to google/gemini-2.5-flash)
```

Railway `vet-connect` service variables hold the **prod** equivalents (same 5
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
- **Schema changes**: add a NEW dated file in `supabase/migrations/` (never edit
  applied ones) → run on dev SQL editor → verify → run on prod. All 5 existing
  files must be applied in filename order on any fresh project.
- **Google OAuth setup** (per Supabase project): Auth → Providers → Google →
  Client ID + Secret; callback URL pattern is
  `<project-url>/auth/v1/callback`; that URL must ALSO be registered in Google
  Cloud Console → Credentials → OAuth client → Authorized redirect URIs.
  Prod URL config: Site URL = app domain, redirect allow-list includes
  `http://localhost:8080/**` and `https://vet-connect.up.railway.app/**`.
  Confirm-email is ON in prod, OFF in dev (deliberate, for frictionless testing).

## Railway deployment notes (gotchas already hit)

- **Node version**: Railway/Nixpacks defaults to Node 18, but deps
  (`@ai-sdk/*`, Vite 8) require Node 22. Fixed via `engines: >=22` in
  `package.json` AND the `NIXPACKS_NODE_VERSION=22` service variable —
  the variable is what Nixpacks actually respects. If a deploy fails, check the
  Node version line in the build log first.
- `railway.toml` also sets `healthcheckPath = "/"` (the `/` page queries the DB,
  so a 500 there means missing/bad Supabase vars, not a platform issue).
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

## Pending / known gaps

- Confirm Railway prod deploy is green on Node 22; do one real Google click-through
  on the live URL.
- Add `AI_GATEWAY_API_KEY` (OpenRouter) locally + on Railway to enable the assistant.
- Repo-wide `npm run lint` still reports pre-existing Prettier drift in untouched
  files; format on touch (`npx prettier --write <file>`) rather than one big reformat.
- Consider `supabase link` + CLI migration tracking later; currently migrations are
  applied manually via the dashboard SQL editor.
