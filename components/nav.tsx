"use client";                                         // needed for hooks
import Link from "next/link";
import { usePathname } from "next/navigation";         // detect active route
import { useTheme } from "next-themes";               // read and set current theme
import { Moon, Sun } from "lucide-react";             // toggle icons
import { Button } from "@/components/ui/button";      // shadcn button for consistent styling
import { SignOutButton } from "@/components/auth/sign-out-button"; // sign-out icon button

// ── Nav link definitions ───────────────────────────────────
const links = [
  { href: "/dashboard",      label: "Dashboard"      },   // dashboard moved to /dashboard
  { href: "/bookings",       label: "Bookings"       },   // unchanged
  { href: "/reconciliation", label: "Reconciliation" },   // unchanged
  { href: "/reports",        label: "Reports"        },   // unchanged
];

// ── Top navigation bar ────────────────────────────────────
export function Nav() {
  const pathname = usePathname();                      // current route path for active highlighting
  const { theme, setTheme } = useTheme();             // current theme value and setter

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-6">

        {/* brand */}
        <Link href="/" className="font-semibold text-foreground tracking-tight">
          🏠 StayOps
        </Link>

        {/* nav links with active state */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);   // prefix match for all routes
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* spacer pushes toggle to the right */}
        <div className="ml-auto" />

        {/* light / dark toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}  /* cycle light ↔ dark */
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />   {/* visible in light mode */}
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /> {/* visible in dark mode */}
        </Button>

        {/* sign-out icon — clears session and redirects to landing page */}
        <SignOutButton />

      </div>
    </nav>
  );
}
