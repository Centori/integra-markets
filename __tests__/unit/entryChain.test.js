/**
 * The entry chain is exactly: index.ts -> app/App.js. Nothing else.
 *
 * MainApp.js at the repo root is a complete, plausible-looking 282-line app
 * shell that NOTHING imports. Code reachable only from it does not exist at
 * runtime, however finished it looks — and it looks finished to every static
 * check, because it IS finished. It is imported by a module nobody imports.
 *
 * Three features have died this way:
 *   1. PaywallProvider  — every paywall.open() was a silent no-op (build 83)
 *   2. Markets tab      — PredictionMarketsScreen never rendered (this branch)
 *   3. Cold-start push  — getLastNotificationResponseAsync (this branch)
 *
 * Each was found separately, by a person noticing. This test finds the next one.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ENTRY = path.join(ROOT, 'index.ts');

// Must be reachable from the entry point. Add a line when you add a screen;
// the test then guarantees it is actually mounted, not merely written.
const MUST_BE_REACHABLE = [
  'app/App.js',
  'app/screens/PredictionMarketsScreen.js',
  'app/components/AlertsScreen.js',
  'app/components/ProfileScreen.js',
  'app/paywall/PaywallProvider.tsx',
  'app/providers/BookmarkProvider.tsx',
  'app/services/entitlementGate.ts',
  'app/services/subscriptionService.ts',
];

// Root-level shells that must never re-enter the entry chain.
const LEGACY_SHELLS = ['MainApp.js', 'MainApp.web.js', 'App.web.js', 'App.web.new.js'];

const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.native.js', '/index.ts', '/index.js'];

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // node_modules — not our graph
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function walk(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    // Static imports, require(), and dynamic import() with a literal specifier.
    // A computed specifier is not resolvable here — if you add one, list its
    // target in MUST_BE_REACHABLE so it stays covered.
    const specs = [
      ...src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g),
      ...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...src.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1]);
    for (const spec of specs) {
      const resolved = resolveImport(file, spec);
      if (resolved) queue.push(resolved);
    }
  }
  return seen;
}

describe('entry chain', () => {
  const reachable = walk(ENTRY);

  it('starts at index.ts', () => {
    expect(fs.existsSync(ENTRY)).toBe(true);
  });

  it.each(MUST_BE_REACHABLE)('%s is reachable from index.ts', (rel) => {
    const abs = path.join(ROOT, rel);
    expect(fs.existsSync(abs)).toBe(true);
    expect(reachable.has(abs)).toBe(true);
  });

  it('contains no legacy root shell', () => {
    const found = LEGACY_SHELLS.map((f) => path.join(ROOT, f)).filter((f) => reachable.has(f));
    expect(found).toEqual([]);
  });
});
