// ── Login page — Option A: banner top, centered card below ───────────────────
// Banner uses the same AI-generated triptych as the landing page.
// Nav bar overlaid on the banner carries the wordmark + home link.
// Card floats below on the slate-50 background.

import Image             from "next/image";                       // Next.js optimised image component
import Link              from "next/link";                        // client-side navigation
import { LoginForm }     from "@/components/auth/login-form";    // sign-in + forgot-password form

// ── Property type labels — matches marketing PropertyBanner ──────────────────
const PROPERTY_TYPES = [
  { label: "Beach villas",    position: "left-[16%]" },          // over the ocean villa panel
  { label: "Mountain cabins", position: "left-[50%]" },          // over the forest cabin panel
  { label: "City apartments", position: "left-[82%]" },          // over the skyline panel
];

// ── Page — async server component, awaits searchParams per Next.js 16 ────────
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;                       // Next.js 16: searchParams is a Promise
}) {
  const { next } = await searchParams;                            // resolve the async searchParams

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Banner section ─────────────────────────────────────────────────── */}
      <section className="relative w-full h-[200px] md:h-[240px] overflow-hidden flex-shrink-0">

        {/* Full-bleed AI-generated property triptych */}
        <Image
          src="/banner-properties.png"
          alt="Beach villa, mountain cabin and city apartment — property types managed by StayOps"
          fill                                                     // fill the section container
          className="object-cover object-center"                   // cover + centre crop
          priority                                                  // above-the-fold — load immediately
          sizes="100vw"                                            // always full viewport width
        />

        {/* Top gradient — keeps nav bar text readable over the image */}
        <div className="absolute inset-x-0 top-0 h-24
                        bg-gradient-to-b from-slate-950/70 to-transparent pointer-events-none" />

        {/* Bottom gradient — fades banner into the slate-50 card section below */}
        <div className="absolute inset-x-0 bottom-0 h-28
                        bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />

        {/* ── Nav bar — wordmark left, Home link right ───────────────────── */}
        <nav className="absolute top-0 inset-x-0 flex items-center justify-between px-6 py-4 z-10">
          <span className="font-[family-name:var(--font-poppins)] font-bold text-white text-lg tracking-tight">
            StayOps
          </span>                                                  {/* wordmark */}
          <Link
            href="/"
            className="text-white/80 hover:text-white text-xs font-medium
                       border border-white/30 hover:border-white/60
                       px-3 py-1.5 rounded-full transition-all duration-150"
          >
            ← Home
          </Link>                                                   {/* back to landing page */}
        </nav>

        {/* Property type pills — bottom of banner, matches landing page style */}
        <div className="absolute bottom-10 inset-x-0">
          {PROPERTY_TYPES.map(({ label, position }) => (
            <span
              key={label}
              className={`absolute -translate-x-1/2 ${position}
                          text-white/80 text-[10px] font-medium tracking-widest uppercase
                          bg-white/10 backdrop-blur-sm border border-white/20
                          px-3 py-1 rounded-full`}
            >
              {label}
            </span>
          ))}
        </div>

      </section>

      {/* ── Card section — centered below the banner ──────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4 pb-16">
        <div className="w-full max-w-sm">

          {/* Sign-in / forgot-password form — heading lives inside the card */}
          <LoginForm next={next ?? "/dashboard"} />

        </div>
      </div>

    </div>
  );
}
