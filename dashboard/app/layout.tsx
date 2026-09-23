import type { Metadata } from "next";
import Image from "next/image";
import { serverClient } from "@/lib/supabase-server";
import "./globals.css";

// Lives in public/ rather than being imported, so it has ONE stable URL:
// /integra-icon.png. An imported asset is emitted under a content hash, which
// is fine for a header logo and useless for anything off-site — and this file
// is now also the favicon and the icon the MCP server advertises to clients.
// Both of those are references we do not control and cannot re-issue.
const ICON_PATH = "/integra-icon.png";

export const metadata: Metadata = {
  title: "Integra Markets",
  description: "Commodity sentiment, divergence signals, and the API to build on them.",
  // Neither the dashboard nor www served a favicon at all — /favicon.ico was a
  // 404 HTML page on both, so every tab showed a blank sheet.
  icons: { icon: ICON_PATH, apple: ICON_PATH },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Auth-aware header: cookie read makes every route dynamic, which is fine
  // at this site's size and keeps "Sign in" vs "Account" always correct.
  const supabase = serverClient();
  const { data } = await supabase.auth.getUser();
  const loggedIn = Boolean(data.user);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-bg-tertiary px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <Image
                src={ICON_PATH}
                alt="Integra Markets"
                width={32}
                height={32}
                className="rounded-lg"
                unoptimized
              />
              <span className="font-semibold">Integra Markets</span>
            </a>
            <nav className="text-sm text-text-secondary flex gap-4 items-center">
              <a href="/api-tier" className="hover:text-text-primary">Pricing</a>
              <a href="/mcp" className="hover:text-text-primary">MCP</a>
              {/* Was https://integra.mintlify.app, which 404s — and this nav is
                  in the global layout, so every page including the public
                  /api-tier pricing page showed a dead "Docs" link to someone
                  deciding whether to pay. Now served on our own domain. */}
              <a href="/docs" className="hover:text-text-primary">Docs</a>
              {loggedIn ? (
                <a
                  href="/account"
                  className="rounded-md bg-accent-positive px-3 py-1.5 font-medium text-bg-primary"
                >
                  Account
                </a>
              ) : (
                <a
                  href="/login"
                  className="rounded-md bg-accent-positive px-3 py-1.5 font-medium text-bg-primary"
                >
                  Sign in
                </a>
              )}
            </nav>
          </header>
          <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
