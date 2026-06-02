"use client";                                                    // required: onClick uses document.getElementById (browser-only API)

import Image from "next/image";                                  // Next.js optimised image — avoids ESLint no-img-element warning

// ── Hero section — dark gradient mesh + headline + CTAs ──
interface HeroProps {
  utmSource?:   string;   // passed from searchParams server-side
  utmMedium?:   string;
  utmCampaign?: string;
}

export function Hero({ utmSource, utmMedium, utmCampaign }: HeroProps) {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden
                 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 animate-gradient-shift"
    >

      {/* Subtle radial glow overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(37,99,235,0.15), transparent)" }}
      />

      {/* Main content — single stacked column, centred */}
      <div className="relative z-10 max-w-4xl w-full mx-auto flex flex-col items-center text-center gap-6">

        {/* Eyebrow badge */}
        <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-slate-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {/* live pulse dot */}
          AI-powered ops — now in early access
        </span>

        {/* Main headline — each phrase on its own line, full-width container so no wrapping */}
        <h1 className="font-[family-name:var(--font-poppins)] font-extrabold text-5xl lg:text-6xl leading-tight text-white">
          <span className="block">Reconcile Every Booking.</span>
          <span className="block text-emerald-400">Resolve Every Conflict.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 text-lg lg:text-xl max-w-2xl leading-relaxed">
          AI-powered ops console for multi-property STR operators.
          Airbnb, Booking.com, MakeMyTrip, and direct — unified in one place.
        </p>

        {/* Reconciliation dashboard screenshot card — between subtext and CTAs */}
        <div
          className="animate-float w-full max-w-2xl rounded-2xl overflow-hidden
                     bg-white/10 backdrop-blur-sm border border-white/20
                     shadow-2xl shadow-blue-950/50"
        >
          {/* Fake browser chrome bar for context */}
          <div className="flex items-center gap-1.5 px-4 py-3 bg-white/5 border-b border-white/10">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />    {/* close dot */}
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" /> {/* minimise dot */}
            <span className="w-3 h-3 rounded-full bg-green-500/70" />  {/* expand dot */}
            <span className="ml-3 text-slate-500 text-xs font-mono truncate">stayops-five.vercel.app/reconciliation</span>
          </div>
          {/* Reconciliation dashboard screenshot captured at 1280×800 from live Vercel deploy */}
          <Image
            src="/screenshots/reconciliation.png"
            alt="StayOps reconciliation dashboard — conflict flags with AI analysis panel"
            width={1280}                                          // native capture width
            height={800}                                         // native capture height
            className="w-full h-auto"
          />
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="#lead-form"
            onClick={(e) => { e.preventDefault(); document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" }); }}
            className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base
                       transition-all duration-150 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 text-center"
          >
            Request Early Access →
          </a>
          <a
            href="#features"
            onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}
            className="px-6 py-3 rounded-full border border-white/20 text-slate-300 hover:text-white hover:border-white/40
                       font-medium text-base transition-all duration-150 text-center"
          >
            See it in action ↓
          </a>
        </div>

        {/* Hidden UTM inputs — passed to lead form via server props */}
        <input type="hidden" name="utm_source"   value={utmSource ?? ""}   readOnly />
        <input type="hidden" name="utm_medium"   value={utmMedium ?? ""}   readOnly />
        <input type="hidden" name="utm_campaign" value={utmCampaign ?? ""} readOnly />

      </div>
    </section>
  );
}
