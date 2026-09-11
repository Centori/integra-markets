import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase session refresh.
 *
 * `web/` has had this since its own auth was fixed; `dashboard/` never got
 * one, which is why /account and /account/api go blank or bounce to /login
 * while the same account works fine on www.
 *
 * `@supabase/ssr` keeps the session in cookies and access tokens are
 * short-lived. A browser client refreshes while a tab is open, but nothing
 * refreshes on a *server* request — so a user who comes back later arrives
 * with an expired access token and a perfectly good refresh token, and every
 * server component calling `getUser()` sees nobody.
 *
 * Two rules from the @supabase/ssr contract that are easy to get wrong:
 *   1. Always return `supabaseResponse`. Building a fresh NextResponse and
 *      dropping its cookies signs the user out at random intervals, which is
 *      much harder to diagnose than never being signed in at all.
 *   2. Call `getUser()`, never `getSession()`. getSession() reads the cookie
 *      without contacting the auth server, so it neither validates nor
 *      refreshes and will hand back an expired identity.
 *
 * Deliberately does NOT redirect. Route protection lives in the pages — each
 * checks its own session and pushes to /login — and adding a second, different
 * gate here is how the two drift apart. Refresh only, one job.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Triggers the refresh. The returned user is intentionally unused — the
  // side effect (rotated cookies on supabaseResponse) is the point.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and image files. Auth cookies are
     * irrelevant to those, and running the refresh on each would add a network
     * round-trip to the auth server per asset.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|ico)$).*)",
  ],
};
