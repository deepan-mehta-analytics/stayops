"use client";                                         // needed for hooks
import Link from "next/link";
import { usePathname } from "next/navigation";         // detect active route
import { SignOutButton } from "@/components/auth/sign-out-button"; // sign-out button

// ── Nav link definitions ───────────────────────────────────
const links = [
  { href: "/dashboard",      label: "Dashboard"      },   // dashboard at /dashboard
  { href: "/bookings",       label: "Bookings"       },   // booking list and import
  { href: "/reconciliation", label: "Reconciliation" },   // conflict flags + AI resolve
  { href: "/reports",        label: "Reports"        },   // SQL revenue reports
];

// ── Top navigation bar — Theme F: navy bg, mint accent, Poppins wordmark ──
export function Nav() {
  const pathname = usePathname();                      // current route for active link highlight

  return (
    <nav className="bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-6">

        {/* brand wordmark — Poppins bold, mint colour, links to landing page */}
        <Link
          href="/"
          className="font-[family-name:var(--font-poppins)] font-bold text-[#00e5a0] tracking-tight text-lg shrink-0"
        >
          StayOps
        </Link>

        {/* nav links — active: mint pill (unchanged); idle: white, turns mint on hover */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);   // prefix match handles sub-routes
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-full text-base transition-colors duration-150 ${
                  isActive
                    ? "bg-[rgba(0,229,160,0.12)] text-[#00e5a0] font-medium"   // active: mint pill — unchanged
                    : "text-white/80 hover:text-[#00e5a0] hover:bg-white/5"    // idle: white; hover → mint
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* spacer pushes right-side actions to the edge */}
        <div className="ml-auto" />

        {/* sign-out icon — white on dark nav, turns mint on hover */}
        <SignOutButton className="text-white/70 hover:text-[#00e5a0] hover:bg-white/5" />

      </div>
    </nav>
  );
}
