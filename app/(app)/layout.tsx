import { Poppins } from "next/font/google";                    // Poppins — brand font matching landing page
import { Nav } from "@/components/nav";                        // operator navigation bar
import { ThemeProvider } from "@/components/theme-provider";  // next-themes dark/light wrapper

// ── Poppins font — same typeface as the marketing landing page ─────────────
const poppins = Poppins({
  variable: "--font-poppins",                                  // CSS variable consumed by Tailwind
  subsets:  ["latin"],                                         // latin only; no unused glyph sets
  weight:   ["400", "600", "700"],                            // regular, semibold, bold
  display:  "swap",                                            // prevent invisible text during font load
});

// ── Operator console layout — applies Nav + Poppins + theme to all (app) routes ──
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"           // injects "dark" class on <html> for dark mode
      defaultTheme="light"        // ops console is always-light in Theme F
    >
      <div className={`${poppins.variable} min-h-full bg-[#f8fafc] text-foreground font-[family-name:var(--font-poppins)]`}>
        <Nav />                                                  {/* persistent operator navigation bar */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}                                             {/* page content injected by Next.js router */}
        </main>
      </div>
    </ThemeProvider>
  );
}
