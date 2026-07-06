// Kept for backwards-compatibility with earlier imports. New code should
// pick the right file directly:
//   - server components / route handlers / server actions → supabase-server
//   - client components ("use client" or top of client-side pages) → supabase-browser
//
// The re-exports here are careful NOT to import server-only code into the
// browser bundle: serverClient is deliberately not re-exported.

export { browserClient } from "./supabase-browser";
