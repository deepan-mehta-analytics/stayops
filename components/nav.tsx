import Link from "next/link";   // Next.js client-side navigation link

// ── Nav items — mirrors the Phase 1 route plan ────────────
const links = [
  { href: "/",              label: "Dashboard"      },   // KPI overview
  { href: "/bookings",      label: "Bookings"       },   // booking list + import
  { href: "/reconciliation",label: "Reconciliation" },   // conflict flags
  { href: "/reports",       label: "Reports"        },   // AI + SQL reports
];

// ── Top navigation bar ────────────────────────────────────
export function Nav() {
  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-6">

        {/* brand wordmark */}
        <Link
          href="/"
          className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight"
        >
          🏠 StayOps
        </Link>

        {/* page links */}
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

      </div>
    </nav>
  );
}
