// The dashboard root is a router, not a page — the landing page lives on the
// marketing site (www.integramarkets.app).
//
// It used to redirect unconditionally to /account, which is gated. So for a
// signed-out visitor the chain was:
//
//     /  ->  /account  ->  /login?redirect=/account
//
// Two hops to reach a login form, and — because the header logo links here —
// clicking the brand mark while signed out returned you to the page you were
// already on. The standard escape hatch was a loop.
//
// Deciding here costs one cookie read and removes the bounce.

import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/account" : "/login");
}
