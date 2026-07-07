"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  const onSignOut = async () => {
    setPending(true);
    await browserClient().auth.signOut();
    window.location.href = "/";
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
