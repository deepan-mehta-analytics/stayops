import posthog from "posthog-js";                              // PostHog client SDK

// ── Initialise PostHog before any page renders ────────────
// instrumentation-client.ts runs on the client before the app mounts —
// the recommended Next.js App Router pattern per PostHog docs (2026).
posthog.init(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!,              // project token from Vercel env
  {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com", // US ingest endpoint
    defaults: "2026-01-30",                                    // opt into PostHog default settings
  }
);
