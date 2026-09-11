# VetNow — agent notes

Read `README.md` for the full stack, environments, and workflows. Critical gotchas:

- **Prod DB migrations are manual.** The Supabase GitHub integration is broken for this
  project: it replays from migration `20260825055814` and fails, and has recorded a
  version without applying its DDL. Keep **Deploy to production OFF** and apply prod
  migrations by hand, then **verify the objects exist** — never trust a `Finished`/success
  message. Dev uses the Supabase CLI (`supabase db push`). See README → "Database migrations".
- **Dev vs prod**: local `.env` points at `vetnow-dev`. Keep prod keys commented; only
  touch prod intentionally, to apply a migration.
- **Railway**: `startCommand` must live under `[deploy]` in `railway.toml` (not `[build]`),
  otherwise Nixpacks serves Caddy and every request 404s. Healthcheck is `/healthz`.
- **Vet verification**: an unverified vet cannot go live, be listed, or be booked. Admin
  approves at `/admin/verifications`; the `admin` role is granted manually in `user_roles`.
- **Node >= 22** required.
