import type { Metadata } from "next";                     // Next.js metadata type
import { Geist, Geist_Mono } from "next/font/google";      // Google font loaders
import "./globals.css";                                      // global Tailwind styles
import { Nav } from "@/components/nav";                     // top navigation bar

// ── Font setup ────────────────────────────────────────────
const geistSans = Geist({
  variable: "--font-geist-sans",   // CSS variable for body font
  subsets: ["latin"],              // latin character subset only
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",   // CSS variable for monospace font
  subsets: ["latin"],              // latin character subset only
});

// ── Page metadata ─────────────────────────────────────────
export const metadata: Metadata = {
  title: "StayOps — Rental Operations Console",                              // browser tab title
  description: "AI-assisted operations console for short/mid-term rental operators.",  // SEO description
};

// ── Root layout — wraps every page with fonts + nav ───────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;   // page content injected by Next.js router
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        <Nav />                                         {/* persistent top navigation */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}                                    {/* page content rendered here */}
        </main>
      </body>
    </html>
  );
}
