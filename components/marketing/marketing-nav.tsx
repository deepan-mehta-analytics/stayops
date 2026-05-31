"use client";                                                   // needed for scroll behaviour
import Link from "next/link";                                   // Next.js link (no full reload)

// ── Sticky marketing nav — transparent on dark hero ───────
export function MarketingNav() {
  // ── Smooth scroll to anchor on same page ──────────────
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); // native smooth scroll
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12">

      {/* Logo wordmark */}
      <Link href="/" className="font-[family-name:var(--font-poppins)] font-semibold text-xl text-white tracking-tight">
        StayOps
      </Link>

      {/* Centre links — hidden on mobile */}
      <div className="hidden md:flex items-center gap-8">
        <button
          onClick={() => scrollTo("features")}
          className="text-slate-300 hover:text-white text-base transition-colors duration-150 cursor-pointer"
        >
          Features
        </button>
        <button
          onClick={() => scrollTo("how-it-works")}
          className="text-slate-300 hover:text-white text-base transition-colors duration-150 cursor-pointer"
        >
          How it works
        </button>
        <Link
          href="/dashboard"
          className="text-slate-300 hover:text-white text-base transition-colors duration-150"
        >
          Dashboard
        </Link>
      </div>

      {/* CTA pill */}
      <button
        onClick={() => scrollTo("lead-form")}
        className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all duration-150 hover:scale-105 cursor-pointer"
      >
        Request Demo →
      </button>

    </nav>
  );
}
