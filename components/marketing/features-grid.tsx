import {
  ShieldAlert,      // double-book detection
  Bot,              // AI conflict resolution
  FileSpreadsheet,  // CSV + Sheets import
  BarChart3,        // KPI dashboard
  ClipboardCheck,   // weekly ops reports
  CalendarClock,    // turnover scheduling
} from "lucide-react";                                           // consistent Lucide icon set
import React from "react";                                       // needed for ComponentType type reference

// ── Feature card props — explicit interface avoids typeof array-element issues ─
interface FeatureCardProps {
  Icon:  React.ComponentType<{ className?: string }>;           // Lucide icon component type
  title: string;                                                 // card heading text
  body:  string;                                                 // card body description
  index: number;                                                 // used for stagger animation delay
}

// ── Feature card data ─────────────────────────────────────
const features: FeatureCardProps[] = [
  {
    Icon:  ShieldAlert,
    title: "Double-book detection",
    body:  "Flags overlapping reservations across Airbnb, Booking.com, MakeMyTrip, and direct — before check-in.",
    index: 0,
  },
  {
    Icon:  Bot,
    title: "AI conflict resolution",
    body:  "Claude streams reasoning token-by-token and proposes a fix with a 0–100 confidence score.",
    index: 1,
  },
  {
    Icon:  FileSpreadsheet,
    title: "CSV + Sheets import",
    body:  "Idempotent ingestion via SHA-256 row hashing — re-import any time without creating duplicates.",
    index: 2,
  },
  {
    Icon:  BarChart3,
    title: "Live KPI dashboard",
    body:  "Occupancy %, ADR, and gross revenue computed from live Postgres rows via server components.",
    index: 3,
  },
  {
    Icon:  ClipboardCheck,
    title: "Weekly ops reports",
    body:  "Claude-generated Markdown summaries delivered weekly to Slack via Vercel Cron.",
    index: 4,
  },
  {
    Icon:  CalendarClock,
    title: "Turnover scheduling",
    body:  "Upcoming turnovers surfaced 48 hours ahead with channel and property context — auto-assigned nightly.",
    index: 5,
  },
];

// ── Individual feature card ───────────────────────────────
function FeatureCard({ Icon, title, body, index }: FeatureCardProps) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4
                 hover:-translate-y-1 transition-transform duration-200 ease-out
                 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}             // stagger entrance per card
    >
      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-emerald-600" />           {/* Lucide icon, consistent size */}
      </div>
      <div>
        <h3 className="font-[family-name:var(--font-poppins)] font-semibold text-slate-900 text-base mb-1">
          {title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ── Features section ──────────────────────────────────────
export function FeaturesGrid() {
  return (
    <section id="features" className="bg-slate-50 py-20 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Section heading */}
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-poppins)] font-bold text-4xl text-slate-900 mb-3">
            Everything your ops team needs
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Purpose-built for multi-property operators across every major booking channel.
          </p>
        </div>

        {/* 3×2 card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

      </div>
    </section>
  );
}
