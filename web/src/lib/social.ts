// Single source of truth for Integra's social accounts.
//
// The footer previously hard-coded three `href="#"` links, which shipped to
// production and rendered as icons that visibly did nothing when clicked. The
// fix is not just "paste the URLs in" — it is to make the handle the only thing
// anyone edits, and to make an unset handle render as ABSENT rather than dead.
//
// Anything that needs to know where Integra lives on a platform reads it from
// here: the web footer today, and the post-scheduling pipeline later, which
// needs the same handles to attribute and cross-link posts.

export type SocialPlatform = 'x' | 'instagram' | 'linkedin';

export type SocialAccount = {
  platform: SocialPlatform;
  /** Display name used for aria-label and alt text. */
  label: string;
  /**
   * The account handle WITHOUT a leading @ (for LinkedIn, the company slug).
   * `null` means "we do not have an account there yet" — the link is then
   * omitted entirely instead of rendering as a dead icon.
   */
  handle: string | null;
};

// ⚠️ THE ONLY LINES THAT NEED EDITING WHEN AN ACCOUNT IS CREATED OR RENAMED.
export const SOCIAL_ACCOUNTS: SocialAccount[] = [
  { platform: 'x', label: 'X', handle: 'integra_Markets' },
  { platform: 'instagram', label: 'Instagram', handle: 'integramarkets' },
  // No LinkedIn company page yet — null keeps the icon off the page entirely
  // rather than shipping a link to nowhere. Fill in the slug to light it up.
  { platform: 'linkedin', label: 'LinkedIn', handle: null },
];

/** Profile URL builders, kept next to the handles so the two cannot drift. */
const PROFILE_URL: Record<SocialPlatform, (handle: string) => string> = {
  x: (h) => `https://x.com/${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  // Company pages, not personal profiles — /company/, not /in/.
  linkedin: (h) => `https://www.linkedin.com/company/${h}`,
};

export type ResolvedSocialAccount = SocialAccount & { handle: string; url: string };

/**
 * The accounts that actually exist, with their URLs resolved.
 *
 * Callers map over THIS, never over SOCIAL_ACCOUNTS, so an account without a
 * handle can never reach the DOM. A stray leading '@' is tolerated because it
 * is the form people paste, and it would otherwise produce a 404 URL that
 * looks correct in review.
 */
export function activeSocialAccounts(
  accounts: SocialAccount[] = SOCIAL_ACCOUNTS,
): ResolvedSocialAccount[] {
  return accounts.flatMap((account) => {
    const handle = account.handle?.trim().replace(/^@/, '') ?? '';
    if (!handle) return [];
    return [{ ...account, handle, url: PROFILE_URL[account.platform](handle) }];
  });
}
