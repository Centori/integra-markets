"use client";

import { useState, useTransition } from "react";
import { createKeyAction, revokeKeyAction } from "./actions";
import type { CreateKeyResponse, KeyRow } from "@/lib/api";

type Props = { initialKeys: KeyRow[]; userEmail: string };

export function KeysPanel({ initialKeys, userEmail }: Props) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreateKeyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createKeyAction(name);
        setCreated(result);
        setKeys((prev) => [
          {
            id: result.id,
            name: result.name,
            prefix: result.prefix,
            scopes: [],
            last_used_at: null,
            created_at: result.created_at,
          },
          ...prev,
        ]);
        setName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  };

  const onRevoke = (id: string) => {
    if (!confirm("Revoke this key? Any application using it will start failing immediately.")) return;
    startTransition(async () => {
      try {
        await revokeKeyAction(id);
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Revoke failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-bg-tertiary bg-bg-secondary p-4">
        <div className="text-sm text-text-secondary mb-2">Signed in as</div>
        <div className="font-mono text-sm">{userEmail}</div>
      </div>

      <div className="rounded-lg border border-bg-tertiary bg-bg-secondary p-6 space-y-4">
        <h2 className="font-semibold">Create a new key</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. local-dev, prod-server, mobile-app"
            disabled={pending}
            className="flex-1 rounded-md bg-bg-primary border border-bg-tertiary px-3 py-2 text-sm focus:outline-none focus:border-accent-positive"
          />
          <button
            onClick={onCreate}
            disabled={pending || keys.length >= 10}
            className="rounded-md bg-accent-positive text-bg-primary font-medium px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create key"}
          </button>
        </div>
        {keys.length >= 10 ? (
          <p className="text-xs text-accent-warning">
            You&apos;ve reached the 10-key limit. Revoke an unused key to create a new one.
          </p>
        ) : null}
        {error ? <p className="text-xs text-accent-negative">{error}</p> : null}
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Your keys ({keys.length})</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-text-secondary">No keys yet. Create one above.</p>
        ) : (
          <ul className="divide-y divide-bg-tertiary border border-bg-tertiary rounded-lg overflow-hidden">
            {keys.map((k) => (
              <li key={k.id} className="bg-bg-secondary px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{k.name}</div>
                  <div className="text-xs text-text-secondary font-mono mt-0.5">
                    {k.prefix}…
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                  </div>
                </div>
                <button
                  onClick={() => onRevoke(k.id)}
                  disabled={pending}
                  className="text-xs text-accent-negative hover:underline disabled:opacity-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {created ? <CreatedKeyModal created={created} onClose={() => setCreated(null)} /> : null}
    </div>
  );
}

function CreatedKeyModal({ created, onClose }: { created: CreateKeyResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(created.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-secondary border border-bg-tertiary rounded-lg p-6 max-w-lg w-full space-y-4">
        <h3 className="font-semibold">Your new API key</h3>
        <p className="text-sm text-text-secondary">
          Copy this key now. We only store its hash — you won&apos;t be able to view it again.
        </p>
        <div className="bg-bg-primary border border-bg-tertiary rounded-md p-3 font-mono text-xs break-all">
          {created.key}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCopy}
            className="rounded-md bg-accent-positive text-bg-primary font-medium px-4 py-2 text-sm"
          >
            {copied ? "Copied ✓" : "Copy key"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-bg-tertiary px-4 py-2 text-sm hover:bg-bg-tertiary"
          >
            I&apos;ve copied it
          </button>
        </div>
      </div>
    </div>
  );
}
