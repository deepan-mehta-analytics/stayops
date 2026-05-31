import { Nav } from "@/components/nav";                        // operator navigation bar
import { ThemeProvider } from "@/components/theme-provider";  // next-themes dark/light wrapper

// ── Operator console layout — applies Nav + theme support to all (app) routes ──
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"           // injects "dark" class on <html> for dark mode
      defaultTheme="system"       // respects OS preference on first visit
      enableSystem                // syncs with prefers-color-scheme media query
    >
      <div className="min-h-full bg-background text-foreground">
        <Nav />                                                  {/* persistent operator navigation bar */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}                                             {/* page content injected by Next.js router */}
        </main>
      </div>
    </ThemeProvider>
  );
}
