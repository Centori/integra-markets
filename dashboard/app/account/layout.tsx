// Shell for everything under /account: a persistent navigation rail on the
// LEFT, content to its right.
//
// Before this, /account and /account/api were each a standalone centred column
// with no way to move between them except the browser back button — the only
// right-aligned thing on the page was the sign-out button. The rail gives the
// account area a spine, so Profile / Keys / Usage / Billing / Alerts read as
// one place rather than as unrelated pages.
//
// It collapses to a single column under `md`, where the rail sits above the
// content — a 200px sidebar on a phone would leave nothing for the content.

import AccountNav from "./AccountNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
      <aside className="md:sticky md:top-8 md:self-start">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Account
        </p>
        <AccountNav />
      </aside>

      {/* minmax(0,1fr) above, so a wide code block or table inside the content
          scrolls within itself instead of stretching the grid column. */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
