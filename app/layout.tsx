import type { Metadata } from "next";                          // Next.js metadata type
import { Geist, Geist_Mono } from "next/font/google";         // Google font loaders
import "./globals.css";                                         // global Tailwind styles
import { Nav } from "@/components/nav";                        // top navigation bar
import { ThemeProvider } from "@/components/theme-provider";  // next-themes wrapper

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
      suppressHydrationWarning                          /* prevents next-themes class mismatch warning */
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider
          attribute="class"           /* injects "dark" class on <html> */
          defaultTheme="system"       /* respects OS preference on first load */
          enableSystem                /* syncs with prefers-color-scheme */
        >
          <Nav />                                         {/* persistent top navigation */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}                                    {/* page content rendered here */}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
