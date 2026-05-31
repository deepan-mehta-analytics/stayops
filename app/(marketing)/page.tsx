import { Suspense }         from "react";                          // required for PostHogProvider (uses useSearchParams internally)
import { MarketingNav }     from "@/components/marketing/marketing-nav";       // sticky transparent nav
import { PropertyBanner }   from "@/components/marketing/property-banner";     // full-width AI-generated property image banner
import { Hero }             from "@/components/marketing/hero";                // dark gradient hero
import { MetricsStrip }     from "@/components/marketing/metrics-strip";       // animated counters
import { FeaturesGrid }     from "@/components/marketing/features-grid";       // 6 feature cards
import { HowItWorks }       from "@/components/marketing/how-it-works";        // 3-step section
import { SocialProof }      from "@/components/marketing/social-proof";        // testimonial card
import { LeadForm }         from "@/components/marketing/lead-form";           // lead capture form
import { PostHogProvider }  from "@/components/marketing/posthog-provider";    // PostHog context

// ── Landing page — reads UTM params server-side ───────────
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>; // Next.js 16 async searchParams — must be awaited
}) {
  const params = await searchParams;                             // await the async searchParams promise
  const utmSource   = params.utm_source;                        // UTM source — captured before client hydration strips URL
  const utmMedium   = params.utm_medium;                        // UTM medium — passed down to form
  const utmCampaign = params.utm_campaign;                      // UTM campaign — passed down to form

  return (
    // PostHogProvider must be inside Suspense — it uses useSearchParams internally
    <Suspense fallback={null}>
      <PostHogProvider>

        <MarketingNav />                                         {/* sticky transparent nav — overlays banner */}

        <PropertyBanner />                                       {/* full-bleed AI triptych — beach, mountain, city */}

        <Hero
          utmSource={utmSource}
          utmMedium={utmMedium}
          utmCampaign={utmCampaign}
        />                                                       {/* full-viewport dark gradient hero */}

        <MetricsStrip />                                         {/* 3 animated counters — viewport-triggered */}

        <FeaturesGrid />                                         {/* 6 feature cards with stagger animation (id="features") */}

        <HowItWorks />                                           {/* 3-step flow section (id="how-it-works") */}

        <SocialProof />                                          {/* Goa operator testimonial card */}

        {/* Lead capture form section */}
        <section id="lead-form" className="bg-slate-50 py-20 px-6">
          <div className="max-w-xl mx-auto">         {/* widened from max-w-lg so heading fits on one line */}
            <LeadForm
              utmSource={utmSource}
              utmMedium={utmMedium}
              utmCampaign={utmCampaign}
            />                                                   {/* form with PostHog funnel tracking */}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-950 text-slate-500 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <span>StayOps · BUSL 1.1 © 2026 Deepan Mehta</span>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/deepan-mehta-analytics/stayops"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-300 transition-colors"
              >
                GitHub ↗
              </a>
              <span className="text-slate-700">·</span>
              <span>Built with Claude Code</span>
            </div>
          </div>
        </footer>

      </PostHogProvider>
    </Suspense>
  );
}
