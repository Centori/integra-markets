import type { MetadataRoute } from "next";

const BASE = "https://www.integramarkets.app";

/**
 * Only pages a signed-out visitor can actually read.
 *
 * Deliberately excludes /dashboard, /alerts, /settings and /onboarding: they are
 * behind auth, so a crawler gets a shell, and listing them in a sitemap is an
 * explicit request to index pages that have no content for the reader.
 *
 * The apex answers 307 to www, so every URL here is the www form — a sitemap
 * that lists the redirecting host makes Google resolve a hop per page and
 * muddies which URL is canonical.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
