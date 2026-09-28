"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  const onSignOut = async () => {
    setPending(true);
    await browserClient().auth.signOut();
    // Straight to /login, with a flag so the page can say what just happened.
    //
    // This used to be "/", which is the dashboard root: it redirects to
    // /account, and /account redirects an anonymous visitor to /login. So a
    // sign-out took two redirects to arrive at a bare login form that gave no
    // indication of why you were looking at it — indistinguishable from a
    // session that had expired on its own, and with nothing linking onward to
    // the rest of the site.
    window.location.href = "/login?signedOut=1";
  };

  return (
    <button
      onClick={onSignOut}
      disabled={pending}
      className="rounded-md border border-bg-tertiary px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
