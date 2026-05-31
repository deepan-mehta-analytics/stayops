"use client";                                                    // PostHog SDK is client-only
import posthog from "posthog-js";                              // PostHog singleton (already init'd in instrumentation-client.ts)
import { PostHogProvider as PHProvider } from "posthog-js/react"; // React context provider

// ── Provider wrapper — passes initialised posthog singleton to React context ──
// posthog.init() is called in instrumentation-client.ts before the app mounts,
// so by the time this renders posthog is already live.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>                              {/* inject posthog into React context for usePostHog() hook */}
      {children}                                               {/* landing page sections receive posthog context */}
    </PHProvider>
  );
}
