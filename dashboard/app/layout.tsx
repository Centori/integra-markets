import type { Metadata } from "next";
import Image from "next/image";
import { serverClient } from "@/lib/supabase-server";
import { MARKETING_ABOUT_URL, MARKETING_URL } from "@/lib/site";
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
            {/* The brand mark leads to the marketing site's About section, for
                everyone.

                It used to point at "/", which on this host is a redirect: signed
                out it bounced through /account to /login, landing a visitor back
                on the page they were already looking at, so the one control
                every visitor knows how to use did nothing precisely when they
                needed a way out.

                The same target signed in or out, deliberately. A console logo
                that changes destination with session state is a small trap, and
                the header's "Account" button and the left rail already cover
                getting back to the console. */}
            <a
              href={MARKETING_ABOUT_URL}
              className="flex items-center gap-2"
              title="About Integra Markets"
            >
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

          {/* The dashboard had no footer, so on any page where the header nav
              was not enough — the login form most of all — there was no route
              back to the rest of Integra at all. The main-site link is first
              and carries an arrow because leaving is what it is for. */}
          <footer className="border-t border-bg-tertiary px-6 py-5">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
              <a
                href={MARKETING_URL}
                className="font-medium text-text-secondary hover:text-text-primary"
              >
                &larr; integramarkets.app
              </a>
              <a href="/api-tier" className="hover:text-text-primary">Pricing</a>
              <a href="/mcp" className="hover:text-text-primary">MCP</a>
              <a href="/docs" className="hover:text-text-primary">Docs</a>
              <a
                href={`${MARKETING_URL}/privacy`}
                className="hover:text-text-primary"
              >
                Privacy
              </a>
              <a
                href={`${MARKETING_URL}/terms`}
                className="hover:text-text-primary"
              >
                Terms
              </a>
              <span className="ml-auto text-text-muted">
                API console
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
