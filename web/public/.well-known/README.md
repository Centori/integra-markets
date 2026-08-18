# `/.well-known/` — domain-verification files

Served statically by Next.js from `web/public/`. Vercel publishes this
directory verbatim, dot-prefixed folder included.

## `apple-developer-domain-association.txt`

Required to verify `www.integramarkets.app` for **Sign in with Apple on the
web**. Apple fetches:

    https://www.integramarkets.app/.well-known/apple-developer-domain-association.txt

and compares it byte-for-byte with the file generated in the Apple Developer
portal (Certificates, Identifiers & Profiles → Identifiers → your Services ID →
Sign in with Apple → Configure → Download).

Paste that file here **unmodified** — no trailing newline changes, no
reformatting. A single altered byte fails verification.

### Why here and not on Supabase

The OAuth Return URL is `https://<project>.supabase.co/auth/v1/callback`, but
Supabase does not serve static files:

    GET https://zhdcpiopihqwcmicjpca.supabase.co/.well-known/apple-developer-domain-association.txt
    -> 404 {"error":"requested path is invalid"}

So the domain we verify with Apple is the one we control — this one. The
alternative (a Supabase Edge Function returning the string) puts a cold-starting
deployable in the auth path to serve a constant, and this repo has already lost
weeks to exactly that failure shape twice: the Mintlify docs link 404ing
unnoticed, and every dashboard build failing silently for weeks.

### Mobile is unaffected

iOS uses the native Sign in with Apple sheet and `signInWithIdToken` against the
**bundle ID**, which requires no domain verification. When adding the web
Services ID to Supabase → Authentication → Providers → Apple, ADD it to the
Client IDs list — do not replace the bundle ID, or native sign-in breaks.

## `integra-path-test.txt`

Proves this directory is actually published. Safe to delete once Apple
verification succeeds.
