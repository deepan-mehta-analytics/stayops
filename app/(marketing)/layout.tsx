import type { Metadata } from "next";                           // Next.js metadata type
import { Poppins } from "next/font/google";                    // Poppins via next/font (self-hosted at build)

// ── Poppins — headings only; body inherits Geist from root layout ──
const poppins = Poppins({
  variable:  "--font-poppins",                                  // CSS variable for Tailwind utility
  subsets:   ["latin"],                                         // latin subset only
  weight:    ["400", "600", "700", "800"],                     // regular, semibold, bold, extrabold
  display:   "swap",                                            // prevent invisible text during load
});

// ── Marketing page metadata ───────────────────────────────
export const metadata: Metadata = {
  title:       "StayOps — AI-Powered STR Operations Console",  // OG + browser tab
  description: "Reconcile bookings, resolve conflicts, and automate ops reports for multi-property short-term rental operators. Airbnb, Booking.com, MakeMyTrip, and direct — unified.",
  openGraph: {
    title:       "StayOps — AI-Powered STR Operations Console",
    description: "Reconcile bookings, resolve conflicts, and automate ops reports for multi-property STR operators.",
    url:         "https://stayops-five.vercel.app",
    type:        "website",
    siteName:    "StayOps",
  },
  twitter: {
    card:  "summary_large_image",                              // large image card on Twitter/X
    title: "StayOps — AI-Powered STR Operations Console",
  },
};

// ── Marketing layout — light-only, no op nav ─────────────
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${poppins.variable} bg-white text-slate-900`}>
      {children}
    </div>
  );
}
