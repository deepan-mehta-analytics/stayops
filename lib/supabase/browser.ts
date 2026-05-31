// ── Browser-side Supabase client — safe to use in Client Components ─────────
// Reads session from cookies managed by @supabase/ssr.
// Do NOT use this in Server Components or middleware.

import { createBrowserClient } from "@supabase/ssr";          // browser-safe factory

// ── Returns a client instance — @supabase/ssr deduplicates internally ───────
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,                    // injected at build time (NEXT_PUBLIC_)
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!                // injected at build time (NEXT_PUBLIC_)
  );
}
