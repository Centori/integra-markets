# Supabase OAuth Setup — Web + Mobile

> ⚠️ **Security note (2026-07-07):** an earlier version of this file had the
> Google OAuth **client secret committed in plaintext**, and every URL pointed
> at the retired Supabase project `jcovjmuaysebdfbpbvdh`. The secret must be
> treated as compromised — **rotate it in Google Cloud Console** (Credentials →
> Web client → "Reset secret") and enter the new value ONLY in the Supabase
> dashboard. Never commit secrets to this repo.

## Current project

- **Supabase project**: `zhdcpiopihqwcmicjpca`
  (https://supabase.com/dashboard/project/zhdcpiopihqwcmicjpca)
- **Production domain**: `https://www.integramarkets.app`
- **Web auth callback**: `https://www.integramarkets.app/auth/callback`
  (Next.js route, proxied from the `integra-web` Vercel project to
  `integra-dashboard` via `vercel.json` rewrites)

## Google (enabled ✅)

Client IDs (public, safe to reference):

- **iOS**: `1039046627332-nk0jejccajfd9u63p5kas0l5ps53nlsq.apps.googleusercontent.com`
  — used natively via `@react-native-google-signin` + `signInWithIdToken`.
- **Web**: `1039046627332-sb9etffag0j3a8ti34hevhrt2qp44qb5.apps.googleusercontent.com`
  — used by Supabase's hosted OAuth flow (`signInWithOAuth`).

### Supabase dashboard (Authentication → Providers → Google)

1. Toggle **ON** (already on for this project).
2. Client ID = the web client ID above; Client Secret = the **rotated** secret.

### Supabase dashboard (Authentication → URL Configuration)

- **Site URL**: `https://www.integramarkets.app`
- **Redirect URLs** (add all):
  ```
  https://www.integramarkets.app/**
  http://localhost:3000/**
  http://localhost:8081/**
  ```

### Google Cloud Console (web client)

- **Authorized redirect URIs**:
  ```
  https://zhdcpiopihqwcmicjpca.supabase.co/auth/v1/callback
  ```
- **Authorized JavaScript origins**:
  ```
  https://www.integramarkets.app
  https://zhdcpiopihqwcmicjpca.supabase.co
  ```

## Apple

- **iOS (native)**: works today — `expo-apple-authentication` +
  `signInWithIdToken`, App ID `com.centori.integramarkets` with the
  Sign in with Apple capability.
- **Web**: requires a separate **Services ID** in the Apple Developer portal
  (Identifiers → Services IDs → e.g. `com.centori.integramarkets.web`) with
  Sign in with Apple enabled, return URL
  `https://zhdcpiopihqwcmicjpca.supabase.co/auth/v1/callback`, plus a `.p8`
  key to generate the client secret. Enter both in Supabase
  (Authentication → Providers → Apple), then set
  `NEXT_PUBLIC_ENABLE_APPLE_AUTH=1` on the `integra-dashboard` Vercel project —
  the login page's Apple button is already wired and appears when that flag
  is set. As of 2026-07-07 the Apple provider is **disabled** in Supabase.

## Environment variables

| Where | Vars |
| --- | --- |
| `eas.json` (mobile builds) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` |
| Vercel `integra-dashboard` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_INTEGRA_API_URL`, (optional) `NEXT_PUBLIC_ENABLE_APPLE_AUTH` |
| Local `.env` (web export) | same `EXPO_PUBLIC_*` trio |

The anon key is public by design (RLS enforces access). The service_role key
and all OAuth client secrets are server-side only — dashboard-entered, never
committed.
