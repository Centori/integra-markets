# Integra Markets — Dashboard

Next.js app for managing API keys. Lives at `dashboard.integramarkets.app` (planned).

## Local setup

```bash
cd dashboard
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open `http://localhost:3000`. Sign in with the email magic link; you'll land on `/api-keys`.

## What it does

- `/login` — Supabase email magic-link sign-in
- `/auth/callback` — exchanges the magic-link code for a session cookie
- `/api-keys` — list, create, revoke. Keys are shown once at creation with a copy-to-clipboard.

The page calls the Integra Markets backend (`/api/keys`) via the [PR #4 routes](../sdk-generator/generate.sh). For local backend testing, set `NEXT_PUBLIC_INTEGRA_API_URL=http://localhost:8000`.

## Deployment

Standalone Vercel project (planned): `dashboard.integramarkets.app`. The root `vercel.json` and the `integra-web` Vercel project are separate from this app.

Build: `npm run build`. Start: `npm start`.
