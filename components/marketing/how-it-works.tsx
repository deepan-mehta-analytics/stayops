// ── Steps data ────────────────────────────────────────────
const steps = [
  {
    number: "01",
    title:  "Import your bookings",
    body:   "Upload a CSV or paste your Google Sheets URL — all channels ingested in one go, duplicates automatically skipped.",
  },
  {
    number: "02",
    title:  "Engine detects conflicts",
    body:   "Rule-based reconciliation flags every double-book, pricing anomaly, gap, and mismatch — instantly, before any human reviews.",
  },
  {
    number: "03",
    title:  "AI resolves flagged items",
    body:   "Claude reads the full booking context, streams its reasoning, proposes the right action, and captures your decision for training.",
  },
];

// ── How it works section ──────────────────────────────────
export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="font-[family-name:var(--font-poppins)] font-bold text-4xl text-slate-900 mb-3">
            From import to resolution in minutes
          </h2>
        </div>

        {/* Steps row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

          {/* Connecting dashed line — visible on md+ only */}
          <div className="hidden md:block absolute top-6 left-1/6 right-1/6 border-t-2 border-dashed border-slate-200 z-0" />

          {steps.map((step) => (
            <div key={step.number} className="relative z-10 flex flex-col items-center text-center gap-4">

              {/* Step number badge */}
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center
                              font-[family-name:var(--font-poppins)] font-bold text-white text-sm">
                {step.number}
              </div>

              <h3 className="font-[family-name:var(--font-poppins)] font-semibold text-slate-900 text-lg">
                {step.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{step.body}</p>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
