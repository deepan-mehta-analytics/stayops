"use client";                                         // needed for usePathname hook
import Link from "next/link";
import { usePathname } from "next/navigation";         // detect active route

// ── Nav link definitions ───────────────────────────────────
const links = [
  { href: "/",               label: "Dashboard"      },
  { href: "/bookings",       label: "Bookings"       },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/reports",        label: "Reports"        },
];

// ── Top navigation bar ────────────────────────────────────
export function Nav() {
  const pathname = usePathname();                      // current route path for active highlighting

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-6">

        {/* brand */}
        <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          🏠 StayOps
        </Link>

        {/* nav links with active state */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"                        // exact match for root only
                ? pathname === "/"
                : pathname.startsWith(link.href);     // prefix match for all other routes
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}
