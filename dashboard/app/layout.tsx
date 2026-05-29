import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Integra Markets — Dashboard",
  description: "Manage your API keys and developer settings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-bg-tertiary px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-positive flex items-center justify-center text-bg-primary font-bold">
                IM
              </div>
              <span className="font-semibold">Integra Markets</span>
            </div>
            <nav className="text-sm text-text-secondary flex gap-4">
              <a href="/api-keys" className="hover:text-text-primary">API keys</a>
              <a href="https://integra.mintlify.app" className="hover:text-text-primary">Docs</a>
            </nav>
          </header>
          <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
