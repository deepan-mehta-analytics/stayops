import type { Metadata } from "next";                          // Next.js metadata type
import { Geist, Geist_Mono } from "next/font/google";         // Google font loaders — shared across all route groups
import "./globals.css";                                         // global Tailwind + tw-animate-css styles

// ── Fonts — defined at root so CSS variables are available everywhere ──
const geistSans = Geist({
  variable: "--font-geist-sans",   // CSS variable consumed by Tailwind font-sans
  subsets: ["latin"],              // latin subset only
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",   // CSS variable for monospace
  subsets: ["latin"],              // latin subset only
});

// ── Root metadata — overridden by each route-group layout ─
export const metadata: Metadata = {
  title: "StayOps",                                            // fallback tab title
  description: "STR operations console and growth platform.", // fallback SEO description
};

// ── Bare shell — fonts injected; route-group layouts add Nav/ThemeProvider/etc ──
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning                                   // next-themes requires this to avoid hydration mismatch
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        {children}                                               {/* route-group layouts inject their own wrappers here */}
      </body>
    </html>
  );
}
