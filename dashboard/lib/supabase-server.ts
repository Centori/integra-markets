// Server-only Supabase client. Imports next/headers, so this file MUST NOT
// be imported from a client component or the Next.js build fails with
// "You're importing a component that needs next/headers".

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function serverClient() {
  const store = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items: { name: string; value: string; options?: Record<string, unknown> }[]) {
        // Cookies are READ-ONLY inside a Server Component. `store.set()`
        // throws there, and an uncaught throw takes the whole page down —
        // which is what made /account and /account/api render blank rather
        // than redirect.
        //
        // The write is attempted anyway because this same client is used from
        // route handlers and server actions, where setting IS allowed and IS
        // required (auth/callback exchanges the code and must persist the
        // session). Swallowing the failure is safe only because middleware.ts
        // now refreshes the session on every request; without that, sessions
        // would silently stop rotating instead of loudly breaking.
        try {
          items.forEach(({ name, value, options }) => {
            store.set(name, value, options as never);
          });
        } catch {
          // Called from a Server Component — middleware handles the refresh.
        }
      },
    },
  });
}
