import { Poppins } from "next/font/google";                    // Poppins — brand font matching landing page
import { Nav } from "@/components/nav";                        // operator navigation bar

// ── Poppins font — same typeface as the marketing landing page ─────────────
const poppins = Poppins({
  variable: "--font-poppins",                                  // CSS variable consumed by Tailwind
  subsets:  ["latin"],                                         // latin only; no unused glyph sets
  weight:   ["400", "600", "700"],                            // regular, semibold, bold
  display:  "swap",                                            // prevent invisible text during font load
});

// ── Operator console layout — applies Nav + Poppins to all (app) routes ─────
// ThemeProvider removed: this console is always-light; CSS vars live in :root
// and need no runtime class toggle. Removing it eliminates the React 19
// script-tag warning caused by next-themes' FOUC-prevention inline script.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${poppins.variable} min-h-full bg-background text-foreground font-[family-name:var(--font-poppins)]`}>
      <Nav />                                                    {/* persistent operator navigation bar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}                                               {/* page content injected by Next.js router */}
      </main>
    </div>
  );
}
