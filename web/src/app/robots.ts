import type { MetadataRoute } from "next";

/**
 * There was no robots.txt at all, which is the first file every crawler asks
 * for. Its absence is not neutral: an authenticated app route that gets linked
 * once can be indexed, and Google had no sitemap pointer, so pages were
 * discoverable only by following links from the homepage.
 *
 * The disallow list is the point as much as the allow. /dashboard, /alerts,
 * /settings and /onboarding are behind auth and render a shell to a crawler —
 * indexing those spends crawl budget on empty pages and puts a signed-out shell
 * in the results for the product's own name.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/alerts", "/settings", "/onboarding", "/auth/"],
      },
    ],
    sitemap: "https://www.integramarkets.app/sitemap.xml",
    host: "https://www.integramarkets.app",
  };
}
