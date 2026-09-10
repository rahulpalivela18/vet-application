# VetNow

Live veterinary availability and booking for Visakhapatnam. Pet owners can see
which vets are available right now, get an AI-structured triage of their concern,
and book a clinic, video, or home consultation.

## Stack

- [TanStack Start](https://tanstack.com/start) + React 19
- TypeScript, Tailwind CSS v4, shadcn/ui
- Supabase (Postgres, Auth, Row Level Security)
- Vite

## Development

Requires Node.js 20+ and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

## Scripts

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `npm run dev`     | Start the dev server            |
| `npm run build`   | Production build                |
| `npm run preview` | Preview the production build    |
| `npm run start`   | Run the built server (Nitro)    |
| `npm run lint`    | Run ESLint                      |
| `npm run format`  | Format with Prettier            |

## Environment

Copy `.env` and set the credentials for your services:

```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# OpenAI-compatible gateway for the VetNow assistant (e.g. OpenRouter)
AI_GATEWAY_BASE_URL=https://openrouter.ai/api/v1
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL=google/gemini-2.5-flash
```

Database schema and Row Level Security policies live in `supabase/migrations`.
The AI assistant uses an OpenAI-compatible gateway configured via environment
variables (see `src/lib/ai-gateway.server.ts`).

## Deploying on Railway

The build targets Nitro's `node-server` preset, so the repo is ready for
Railway: build with `npm run build`, start with `npm run start`
(`node .output/server/index.mjs`). The `railway.toml` in this repo sets this up.
The database/backend is self-hosted Supabase on Railway (Postgres, Auth,
PostgREST, Studio); point the `SUPABASE_*` variables at it and apply
`supabase/migrations` to the new database.
