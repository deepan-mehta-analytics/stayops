"use client";                                                    // required: onClick uses document.getElementById (browser-only API)

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

      {/* Main content — two column on lg, stacked on mobile */}
      <div className="relative z-10 max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-12 items-center">

        {/* Left: headline + sub + CTAs */}
        <div className="flex flex-col gap-6">

          {/* Eyebrow badge */}
          <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-slate-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {/* live pulse dot */}
            AI-powered ops — now in early access
          </span>

          {/* Main headline */}
          <h1 className="font-[family-name:var(--font-poppins)] font-extrabold text-5xl lg:text-7xl leading-tight text-white">
            Reconcile Every Booking.{" "}
            <span className="text-emerald-400">Resolve Every Conflict.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-slate-400 text-lg lg:text-xl max-w-lg leading-relaxed">
            AI-powered ops console for multi-property STR operators.
            Airbnb, Booking.com, MakeMyTrip, and direct — unified in one place.
          </p>

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

        {/* Right: floating dashboard screenshot card */}
        <div className="hidden lg:flex justify-center items-center">
          <div
            className="animate-float rounded-2xl overflow-hidden
                       bg-white/10 backdrop-blur-sm border border-white/20
                       shadow-2xl shadow-blue-950/50 max-w-md w-full"
          >
            {/* Fake browser chrome bar for context */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white/5 border-b border-white/10">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />    {/* close dot */}
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" /> {/* minimise dot */}
              <span className="w-3 h-3 rounded-full bg-green-500/70" />  {/* expand dot */}
              <span className="ml-3 text-slate-500 text-xs font-mono truncate">stayops-five.vercel.app/reconciliation</span>
            </div>
            {/* Screenshot placeholder — replace with real screenshot at ship time */}
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <p className="text-slate-500 text-sm font-mono">[ reconciliation dashboard screenshot ]</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
