// ── Auth layout — minimal centred shell, no nav, no theme provider ───────────
// Wraps /login (and any future /reset-password, /invite pages).
import { Poppins } from "next/font/google";                    // Poppins for wordmark, matching marketing layout

// ── Poppins — loaded here so --font-poppins CSS variable is available ────────
const poppins = Poppins({
  variable: "--font-poppins",                                  // CSS variable consumed by login page wordmark
  subsets:  ["latin"],                                         // latin subset only
  weight:   ["400", "600", "700", "800"],                     // regular, semibold, bold, extrabold
  display:  "swap",                                            // prevent invisible text during font load
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;                                   // login, reset-password, and any future auth pages
}) {
  return (
    // Apply Poppins CSS variable and base background — pages manage their own layout
    <div className={`${poppins.variable} min-h-screen bg-slate-50`}>
      {children}
    </div>
  );
}
