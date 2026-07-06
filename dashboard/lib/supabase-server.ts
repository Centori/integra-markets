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
        items.forEach(({ name, value, options }) => {
          store.set(name, value, options as never);
        });
      },
    },
  });
}
