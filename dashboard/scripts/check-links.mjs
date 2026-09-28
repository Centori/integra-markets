#!/usr/bin/env node
/**
 * Every internal link in the dashboard must point at a route that exists, and
 * the dashboard must offer a way back to the rest of Integra.
 *
 * Three navigation dead ends have shipped from this directory:
 *
 *   1. The global header's "Docs" link pointed at https://integra.mintlify.app,
 *      which 404s. It sat in the layout, so every page — including the public
 *      pricing page shown to someone deciding whether to pay — carried a dead
 *      link, for weeks, and nothing surfaced it.
 *
 *   2. The header logo pointed at "/", which redirects to /account, which
 *      redirects an anonymous visitor to /login. Signed out, clicking the brand
 *      mark returned you to the page you were already on: the one affordance
 *      every site has for escaping a dead end was itself the dead end.
 *
 *   3. Nothing anywhere linked to www.integramarkets.app, so after signing out
 *      there was no route back to the landing page — or to the marketing site's
 *      own login and signup.
 *
 * All three are static properties of the source, which is why this is a script
 * and not a browser test. Run in CI beside check-tool-parity.mjs, which exists
 * for the same class of bug: two things that must agree, and no reason they
 * would.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DASHBOARD = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(DASHBOARD, "app");

const failures = [];
const fail = (message) => failures.push(message);

// ---------------------------------------------------------------------------
// Enumerate the routes that actually exist.
// ---------------------------------------------------------------------------

/** App-router segments holding a page.tsx or route.ts, as URL paths. */
function discoverRoutes(dir, prefix = "") {
  const routes = new Set();
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Route groups (parentheses) do not appear in the URL.
      const segment = entry.startsWith("(") ? "" : `/${entry}`;
      for (const nested of discoverRoutes(full, prefix + segment)) routes.add(nested);
    } else if (entry === "page.tsx" || entry === "page.ts" || entry === "route.ts") {
      routes.add(prefix === "" ? "/" : prefix);
    }
  }
  return routes;
}

const ROUTES = discoverRoutes(APP);

// ---------------------------------------------------------------------------
// Collect every href in the source.
// ---------------------------------------------------------------------------

function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) files.push(full);
  }
  return files;
}

const FILES = [...sourceFiles(APP), ...sourceFiles(join(DASHBOARD, "lib"))];

// Literal hrefs only. A templated one (href={`${X}/y`}) cannot be resolved
// statically, and guessing at it would produce false failures — the risk this
// script covers is a hard-coded path that quietly stops existing.
const HREF = /(?:href|action)=["'](\/[^"'#?]*)/g;

for (const file of FILES) {
  const source = readFileSync(file, "utf8");
  const rel = file.slice(DASHBOARD.length + 1);
  for (const [, href] of source.matchAll(HREF)) {
    // Trailing slash tolerated; "/" itself is the root route.
    const path = href.length > 1 ? href.replace(/\/$/, "") : href;
    if (!ROUTES.has(path)) {
      fail(
        `${rel} links to ${href}, which is not a route. ` +
          `Known routes: ${[...ROUTES].sort().join(", ")}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// The escape hatch.
// ---------------------------------------------------------------------------

const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
const loginForm = readFileSync(join(APP, "login", "LoginForm.tsx"), "utf8");

if (!/MARKETING_URL/.test(layout)) {
  fail(
    "app/layout.tsx does not reference MARKETING_URL. The global chrome is the " +
      "only place guaranteed to be on every page, so it is where the route back " +
      "to www.integramarkets.app has to live."
  );
}

if (!/<footer/.test(layout)) {
  fail(
    "app/layout.tsx has no <footer>. The header nav is hidden behind an " +
      "auth-dependent branch on some pages; the footer is what makes the way " +
      "out unconditional."
  );
}

if (!/MARKETING_URL/.test(loginForm)) {
  fail(
    "app/login/LoginForm.tsx does not link to MARKETING_URL. Every gated route " +
      "sends an anonymous visitor here, so a login page with no way onward is a " +
      "terminal state."
  );
}

// The specific regression: the logo must not point at a route that bounces an
// anonymous visitor straight back to where they are.
if (/href="\/"\s+className="flex items-center gap-2"/.test(layout)) {
  fail(
    'app/layout.tsx: the header logo points at "/" unconditionally. That route ' +
      "redirects a signed-out visitor to /login, so on /login the brand mark is " +
      "a no-op — which is exactly when someone needs it to work."
  );
}

// ---------------------------------------------------------------------------

if (failures.length) {
  console.error(`\n${failures.length} navigation problem(s):\n`);
  for (const message of failures) console.error(`  • ${message}\n`);
  process.exit(1);
}

console.log(
  `dashboard links OK — ${FILES.length} files checked against ` +
    `${ROUTES.size} routes, escape hatches present.`
);
