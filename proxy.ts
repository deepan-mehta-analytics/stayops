// ── Edge middleware — session refresh + route guard ──────────────────────────
// Runs before every non-static request. Refreshes the Supabase session cookie
// so Server Components always see a valid (non-expired) token.
// Unauthenticated requests to (app) routes are redirected to /login.

import { createServerClient }              from "@supabase/ssr";               // middleware-compatible client factory
import { NextResponse, type NextRequest }  from "next/server";                 // Next.js edge request/response types

// ── Routes that require authentication ───────────────────────────────────────
const PROTECTED_PREFIXES = ["/dashboard", "/bookings", "/reconciliation", "/reports"]; // all (app) route paths

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });                                // default: pass through unchanged

  // ── Build a Supabase client wired to the edge request/response cookies ────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,                                     // project URL env var
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,                                // publishable/anon key env var
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();                                      // read all cookies from incoming request
        },
        setAll(cookiesToSet) {
          // Write updated cookies to both the mutable request copy and the outgoing response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)                                   // update request cookie store
          );
          response = NextResponse.next({ request });                            // rebuild response with the updated request
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)                         // attach refreshed cookie to response
          );
        },
      },
    }
  );

  // ── IMPORTANT: use getUser() not getSession() ────────────────────────────
  // getSession() reads from the cookie without re-validating with Supabase Auth.
  // getUser() makes a lightweight server call to confirm the token is still valid.
  const { data: { user } } = await supabase.auth.getUser();                   // verify session with Supabase Auth server

  const { pathname } = request.nextUrl;                                        // current request path

  // ── Guard: unauthenticated user → redirect to /login with next param ─────
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)                                                // prefix-match all (app) routes
  );
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);                           // build absolute login URL
    loginUrl.searchParams.set("next", pathname);                               // preserve intended destination
    return NextResponse.redirect(loginUrl);                                    // redirect unauthenticated request
  }

  // ── Convenience: authenticated user hitting /login → go to dashboard ──────
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));          // skip login if already signed in
  }

  return response;                                                             // pass through with refreshed session cookie
}

// ── Matcher: run middleware on all routes except Next.js internals + static ──
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],            // exclude static assets and API routes
};
