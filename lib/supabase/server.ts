// ── Server-side Supabase client — reads and writes session cookies ──────────
// Use this in Server Components, Route Handlers, and middleware.
// Never import this into Client Components — use browser.ts instead.

import { createServerClient } from "@supabase/ssr";            // SSR-compatible client factory
import { cookies }            from "next/headers";             // Next.js 16 cookie store (async)

// ── Factory — call once per request; cookies() reads the incoming request ───
export async function getSupabaseServer() {
  const cookieStore = await cookies();                         // async in Next.js 16

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,                    // project URL — safe to expose
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,               // anon key — rate-limited by RLS
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();                         // forward all cookies to Supabase
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)            // write refreshed session cookies
            );
          } catch {
            // setAll may be called from a Server Component render — safe to ignore
          }
        },
      },
    }
  );
}
