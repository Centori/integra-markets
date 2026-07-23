#!/usr/bin/env node
/**
 * One-shot RevenueCat setup for Integra Pro (build 83).
 * Creates (idempotently) the products, entitlement, offering, and packages the
 * mobile paywall expects — so nothing is typed by hand in the dashboard.
 *
 * SECURITY: your RevenueCat SECRET key is read from the environment and never
 * leaves your machine. Do NOT paste it into chat or commit it.
 *
 * PREREQUISITE: the two App Store Connect subscriptions must already exist
 * (created in ASC, or via the RevenueCat dashboard's "create in App Store
 * Connect"). RevenueCat products reference those store identifiers.
 *
 * Run:
 *   RC_SECRET_KEY=sk_xxx \
 *   RC_PROJECT_ID=proj_xxx \
 *   RC_APP_ID=app_xxx \
 *   node scripts/revenuecat-setup.mjs
 *
 * Get the values from the RevenueCat dashboard:
 *   RC_SECRET_KEY → Project settings → API keys → "Secret key (v2)"  (sk_...)
 *   RC_PROJECT_ID → the /projects/<THIS>/ segment in the URL
 *   RC_APP_ID     → Project settings → Apps → your iOS app (id starts app_...)
 */

const API = 'https://api.revenuecat.com/v2';

const SECRET = process.env.RC_SECRET_KEY;
const PROJECT = process.env.RC_PROJECT_ID;
const APP = process.env.RC_APP_ID;

if (!SECRET || !PROJECT || !APP) {
  console.error('Missing env. Need RC_SECRET_KEY, RC_PROJECT_ID, RC_APP_ID.');
  process.exit(1);
}

// ---- the contract the paywall + subscriptionService expect ----
const ENTITLEMENT = { lookup_key: 'basic_markets', display_name: 'Integra Pro (Markets)' };
const OFFERING = { lookup_key: 'default', display_name: 'Integra Pro' };
const PRODUCTS = [
  { store_identifier: 'com.centori.integramarkets.basic_markets_monthly', package: 'basic_markets_monthly', display_name: 'Pro Monthly' },
  { store_identifier: 'com.centori.integramarkets.basic_markets_annual',  package: 'basic_markets_annual',  display_name: 'Pro Annual'  },
];

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

// List helper (v2 paginates under `items`).
async function list(path) {
  const out = [];
  let url = `${path}?limit=100`;
  while (url) {
    const page = await api('GET', url);
    out.push(...(page.items || []));
    url = page.next_page || null; // next_page is a full path when present
  }
  return out;
}

async function findOrCreate(kind, path, matchFn, createBody, createPath = path) {
  const existing = (await list(path)).find(matchFn);
  if (existing) {
    console.log(`✓ ${kind} exists: ${existing.lookup_key || existing.store_identifier || existing.id}`);
    return existing;
  }
  const created = await api('POST', createPath, createBody);
  console.log(`＋ ${kind} created: ${created.lookup_key || created.store_identifier || created.id}`);
  return created;
}

async function main() {
  console.log(`RevenueCat setup → project ${PROJECT}\n`);

  // 1) Products (reference the ASC store identifiers)
  const products = [];
  for (const p of PRODUCTS) {
    const prod = await findOrCreate(
      'product',
      `/projects/${PROJECT}/products`,
      (x) => x.store_identifier === p.store_identifier,
      { store_identifier: p.store_identifier, app_id: APP, type: 'subscription', display_name: p.display_name },
    );
    products.push({ ...p, id: prod.id });
  }

  // 2) Entitlement, with both products attached
  const ent = await findOrCreate(
    'entitlement',
    `/projects/${PROJECT}/entitlements`,
    (x) => x.lookup_key === ENTITLEMENT.lookup_key,
    ENTITLEMENT,
  );
  await api('POST', `/projects/${PROJECT}/entitlements/${ent.id}/actions/attach_products`, {
    product_ids: products.map((p) => p.id),
  });
  console.log(`  ↳ attached ${products.length} products to entitlement ${ent.lookup_key}`);

  // 3) Offering (mark current)
  const off = await findOrCreate(
    'offering',
    `/projects/${PROJECT}/offerings`,
    (x) => x.lookup_key === OFFERING.lookup_key,
    { ...OFFERING, is_current: true },
  );

  // 4) Packages, each with its product attached
  const existingPkgs = await list(`/projects/${PROJECT}/offerings/${off.id}/packages`);
  for (const p of products) {
    let pkg = existingPkgs.find((x) => x.lookup_key === p.package);
    if (!pkg) {
      pkg = await api('POST', `/projects/${PROJECT}/offerings/${off.id}/packages`, {
        lookup_key: p.package, display_name: p.display_name,
      });
      console.log(`＋ package created: ${p.package}`);
    } else {
      console.log(`✓ package exists: ${p.package}`);
    }
    await api('POST', `/projects/${PROJECT}/packages/${pkg.id}/actions/attach_products`, {
      products: [{ product_id: p.id, eligibility_criteria: 'all' }],
    });
    console.log(`  ↳ attached ${p.store_identifier} to package ${p.package}`);
  }

  console.log('\n✅ Done. Verify in Dashboard → Product catalog → Offerings (default = current).');
}

main().catch((e) => { console.error('\n✗ FAILED\n' + e.message); process.exit(1); });
