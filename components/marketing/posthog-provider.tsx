"use client";                                                    // PostHog SDK is client-only
import posthog from "posthog-js";                              // PostHog client SDK
import { PostHogProvider as PHProvider } from "posthog-js/react"; // React context provider
import { useEffect } from "react";                             // init side effect

// ── PostHog initialiser — call once per page load ─────────────────────────────
function PostHogInit() {
  useEffect(() => {
    posthog.init(                                              // initialise with project API key
      process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",              // env var set in Vercel + .env.local
      {
        api_host:         process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com", // ingest endpoint
        capture_pageview: true,                               // auto-capture pageview on init
        capture_pageleave: true,                              // capture when user leaves page
        autocapture:      false,                              // manual event capture only — keeps data clean
      }
    );
  }, []);                                                     // empty dep array — run once on mount

  return null;                                                // no visible UI
}

// ── Provider wrapper — Suspense boundary lives in page.tsx ────────────────────
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>                             {/* pass singleton posthog instance to context */}
      <PostHogInit />                                         {/* fire init effect once inside the provider */}
      {children}                                              {/* landing page sections receive posthog context */}
    </PHProvider>
  );
}
