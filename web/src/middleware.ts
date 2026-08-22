import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase session refresh.
 *
 * Why this file has to exist: `@supabase/ssr` stores the auth session in
 * cookies, and access tokens are short-lived. The browser client can refresh
 * a token while a tab is open, but nothing refreshes it on a *server* request —
 * so a user who closes the tab and comes back tomorrow arrives with an expired
 * token and is bounced to /login even though their refresh token is still good.
 * That is the "why am I signed out again?" complaint.
 *
 * `supabase.auth.getUser()` below performs the refresh and writes the rotated
 * cookies onto the outgoing response. It must run on every matched request.
 *
 * Two rules from the @supabase/ssr contract that are easy to get wrong:
 *   1. Always return `supabaseResponse` — building a fresh NextResponse and
 *      dropping its cookies signs the user out at random intervals, which is
 *      far harder to diagnose than never being signed in at all.
 *   2. Call `getUser()`, never `getSession()`. getSession() reads the cookie
 *      without contacting the auth server, so it neither validates nor
 *      refreshes and will happily hand back an expired identity.
 *
 * This middleware deliberately does NOT redirect. Route protection already
 * lives in the pages (each checks its own session and pushes to /login), and
 * adding a second, different gate here is how those two rules drift apart.
 * Refresh only — one job.
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
                setAll(cookiesToSet) {
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
         * irrelevant to those, and running the refresh on each one would add a
         * network round-trip to the auth server per asset.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm|ico)$).*)',
    ],
};
