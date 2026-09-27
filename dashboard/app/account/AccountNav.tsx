"use client";

// Left rail for the account area. Client component only because the active
// item is derived from the current path.
//
// Items with no `href` render as plain text with a "Soon" marker rather than
// as links, because a nav pointing at a route that does not exist is the exact
// failure we spent a day on: the console's "Docs" link pointed at a 404 for
// weeks and nothing surfaced it. A visibly unfinished item is honest; a dead
// link is a bug.
//
// Nothing is unfinished at the moment. The mechanism stays because it is what
// makes adding the next item safe, and because "Soon" on Usage / Billing /
// Alerts was load-bearing for three months — api_key_usage was recording every
// request the whole time with nothing able to read it.

import { usePathname } from "next/navigation";

type Item = { label: string; href?: string; exact?: boolean; hint: string };

const ITEMS: Item[] = [
  { label: "Overview", href: "/account", exact: true, hint: "Plan and account details" },
  { label: "API keys", href: "/account/api", hint: "Create, rotate and revoke" },
  { label: "Usage", href: "/account/usage", hint: "Requests, errors and quota" },
  { label: "Billing", href: "/account/billing", hint: "Invoices and plan changes" },
  // API quota alerts specifically. The mobile app's price and news alerts are a
  // different feature with a different delivery path, and the old hint here
  // ("Mirrors the mobile app") promised this page would be them.
  { label: "Alerts", href: "/account/alerts", hint: "Quota warnings" },
];

export default function AccountNav() {
  const pathname = usePathname();

  const isActive = (item: Item) =>
    item.href !== undefined &&
    (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active = isActive(item);

        if (!item.href) {
          return (
            <span
              key={item.label}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-text-muted"
              title={item.hint}
            >
              {item.label}
              <span className="rounded border border-bg-tertiary px-1.5 py-px text-[10px] uppercase tracking-wide">
                Soon
              </span>
            </span>
          );
        }

        return (
          <a
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.hint}
            className={
              active
                ? "rounded-md border-l-2 border-accent-positive bg-bg-secondary px-3 py-2 text-sm font-medium text-text-primary"
                : "rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
