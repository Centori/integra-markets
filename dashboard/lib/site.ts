/**
 * Where the rest of Integra lives.
 *
 * The dashboard is its own deployment on dashboard.integramarkets.app, and the
 * marketing site — the landing page, pricing narrative, privacy and terms — is
 * a separate one on www.integramarkets.app (web/ in this repo). Until now
 * NOTHING in the dashboard linked to it, in either direction that matters:
 *
 *   * The header logo pointed at "/", which is the DASHBOARD root. That route
 *     redirects to /account, and /account redirects an anonymous visitor to
 *     /login — so a signed-out user clicking the brand mark, the universally
 *     understood "take me home", arrived back at the page they were already on.
 *     The one affordance every site has for escaping a dead end was itself the
 *     dead end.
 *   * Signing out sent the browser to "/" and therefore through that same
 *     chain, landing on a bare login form with no route onward.
 *
 * Kept as an env-overridable constant rather than hard-coded at each call site
 * so a domain change is one Vercel variable, not a grep.
 *
 * Points at the www host directly: the apex integramarkets.app answers 307 to
 * www, and sending users through a redirect we already know the answer to is a
 * round trip for nothing.
 */
export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "https://www.integramarkets.app";

/** The marketing site's own sign-in page, for the account-recovery path. */
export const MARKETING_LOGIN_URL = `${MARKETING_URL}/login`;

/**
 * The "About" section on the marketing landing page.
 *
 * An anchor rather than a route — `web/src/components/About.tsx` renders
 * `<section id="about">` inside the landing page, and the marketing header
 * links to it the same way. Pointing at a `/about` path would 404.
 *
 * This is where the header logo goes. A brand mark is the one control every
 * visitor already knows how to use, and on a console whose own root is a
 * redirect it was previously either a loop (signed out) or a no-op on the page
 * you were already looking at.
 */
export const MARKETING_ABOUT_URL = `${MARKETING_URL}/#about`;
