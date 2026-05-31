import posthog from "posthog-js";                              // PostHog client SDK

// ── Initialise PostHog only on marketing pages ────────────
// instrumentation-client.ts runs on every page — guard with pathname so
// the ops console (/dashboard, /bookings, etc.) stays untracked.
const isMarketingPage = typeof window !== "undefined" &&       // guard for SSR safety
  !window.location.pathname.startsWith("/dashboard") &&        // exclude ops console
  !window.location.pathname.startsWith("/bookings") &&         // exclude bookings
  !window.location.pathname.startsWith("/reconciliation") &&   // exclude reconciliation
  !window.location.pathname.startsWith("/reports");            // exclude reports

if (isMarketingPage) {
  posthog.init(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!,            // project token from Vercel env
    {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com", // US ingest endpoint
      defaults: "2026-01-30",                                  // opt into PostHog default settings
    }
  );
}
