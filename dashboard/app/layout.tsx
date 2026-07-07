import type { Metadata } from "next";
import Image from "next/image";
import { serverClient } from "@/lib/supabase-server";
import integraIcon from "@/assets/integra-icon.png";
import "./globals.css";

export const metadata: Metadata = {
  title: "Integra Markets",
  description: "Commodity sentiment, divergence signals, and the API to build on them.",
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
                src={integraIcon}
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
              <a href="https://integra.mintlify.app" className="hover:text-text-primary">Docs</a>
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
