"use client";                                                    // useState, fetch, posthog are client-only
import { useState } from "react";                               // form state management
import { usePostHog } from "posthog-js/react";                  // PostHog event tracking hook

// ── Channel options for multi-select checkboxes ───────────
const CHANNELS = ["Airbnb", "Booking.com", "MakeMyTrip", "Direct", "Other"] as const;

// ── Per-channel pastel palette: default (idle + hover) and selected states ──
const CHANNEL_STYLES: Record<typeof CHANNELS[number], { idle: string; selected: string }> = {
  "Airbnb":      {
    idle:     "bg-rose-50   border-rose-200   text-rose-600   hover:bg-rose-100   hover:border-rose-400   hover:text-rose-700",
    selected: "bg-rose-100  border-rose-500   text-rose-800   font-medium",
  },
  "Booking.com": {
    idle:     "bg-sky-50    border-sky-200    text-sky-600    hover:bg-sky-100    hover:border-sky-400    hover:text-sky-700",
    selected: "bg-sky-100   border-sky-500    text-sky-800    font-medium",
  },
  "MakeMyTrip":  {
    idle:     "bg-amber-50  border-amber-200  text-amber-600  hover:bg-amber-100  hover:border-amber-400  hover:text-amber-700",
    selected: "bg-amber-100 border-amber-500  text-amber-800  font-medium",
  },
  "Direct":      {
    idle:     "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-700",
    selected: "bg-violet-100 border-violet-500 text-violet-800 font-medium",
  },
  "Other":       {
    idle:     "bg-slate-50  border-slate-200  text-slate-500  hover:bg-slate-100  hover:border-slate-400  hover:text-slate-700",
    selected: "bg-slate-100 border-slate-500  text-slate-700  font-medium",
  },
};

// ── Property count options for select ────────────────────
const PROPERTY_COUNTS = ["1", "2–5", "6–15", "16+"] as const;

// ── Lead form props — UTM values from server component ───
interface LeadFormProps {
  utmSource?:   string;
  utmMedium?:   string;
  utmCampaign?: string;
}

// ── Lead capture form ─────────────────────────────────────
export function LeadForm({ utmSource, utmMedium, utmCampaign }: LeadFormProps) {
  const posthog = usePostHog();                                  // access PostHog client

  // ── Form field state ───────────────────────────────────
  const [email,         setEmail]         = useState("");        // required email field
  const [propertyCount, setPropertyCount] = useState("");        // optional select
  const [channels,      setChannels]      = useState<string[]>([]); // optional multi-select
  const [message,       setMessage]       = useState("");        // optional textarea

  // ── Submission state ───────────────────────────────────
  const [loading,   setLoading]   = useState(false);            // request in flight
  const [submitted, setSubmitted] = useState(false);            // success state
  const [error,     setError]     = useState<string | null>(null); // error message

  // ── Track form start on first input focus ─────────────
  const [formStarted, setFormStarted] = useState(false);
  function handleFormStart() {
    if (formStarted) return;
    setFormStarted(true);
    posthog?.capture("form_start", { field: "email" });         // PostHog: funnel step 3
  }

  // ── Toggle a channel checkbox ─────────────────────────
  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch] // add or remove
    );
  }

  // ── Form submit handler ───────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    posthog?.capture("form_submit_attempt", {
      has_property_count: !!propertyCount,
      channel_count:      channels.length,
    });                                                          // PostHog: funnel step 4

    // Read honeypot value from hidden input
    const form = e.currentTarget;
    const hp   = (form.elements.namedItem("hp") as HTMLInputElement)?.value ?? "";

    const payload = {
      email,
      propertyCount: propertyCount || undefined,               // omit if empty
      channelsUsed:  channels.length ? channels.join(",") : undefined, // comma-separated
      message:       message || undefined,
      utmSource,
      utmMedium,
      utmCampaign,
      posthogSession: posthog?.get_session_id() ?? undefined,  // PostHog session for funnel join
      source:         utmSource ? "paid" : "organic",          // infer source from UTM presence
      hp,                                                       // honeypot — server silently rejects if non-empty
    };

    const res  = await fetch("/api/leads", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const data = await res.json() as { ok?: boolean; error?: string };

    if (res.status === 201 && data.ok) {
      setSubmitted(true);
      posthog?.capture("lead_created", {
        has_property_count: !!propertyCount,
        channel_count:      channels.length,
        has_message:        !!message,
      });                                                        // PostHog: funnel step 5 (conversion)
    } else if (res.status === 200) {
      setSubmitted(true);                                        // honeypot triggered — show success to bot
    } else {
      setError("Something went wrong. Please try again.");
      posthog?.capture("form_error", { error_type: "api_error" }); // PostHog: error event
    }

    setLoading(false);
  }

  // ── Success state ─────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-poppins)] font-semibold text-slate-900 text-xl mb-2">
          You&apos;re on the list
        </h3>
        <p className="text-slate-500 text-sm">
          We&apos;ll reach out within 48 hours to set up a walkthrough.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">

      {/* Form heading */}
      <h2 className="font-[family-name:var(--font-poppins)] font-bold text-2xl text-slate-900 mb-2">  {/* text-2xl fits on one line at card width */}
        Ready to reconcile your properties?
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        We&apos;re onboarding early-access operators. No commitment — just a conversation.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

        {/* Honeypot — hidden from humans, filled by bots */}
        <input
          name="hp"
          type="text"
          tabIndex={-1}                                          // skip in keyboard nav
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"                                    // visually hidden via Tailwind
          defaultValue=""
        />

        {/* Work email (required) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Work email <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleFormStart}                            // trigger PostHog form_start event
            placeholder="you@company.com"
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900
                       placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                       focus:border-emerald-500 transition-all duration-150"
          />
        </div>

        {/* Property count (optional) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="propertyCount" className="text-sm font-medium text-slate-700">
            How many properties? <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            id="propertyCount"
            name="propertyCount"
            value={propertyCount}
            onChange={(e) => setPropertyCount(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900
                       focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                       transition-all duration-150 bg-white"
          >
            <option value="">Select range…</option>
            {PROPERTY_COUNTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Channels used (optional multi-select) */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-700">
            Channels you use <span className="text-slate-400 font-normal">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <label
                key={ch}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer
                            transition-all duration-200 select-none
                            ${channels.includes(ch)
                              ? CHANNEL_STYLES[ch].selected
                              : CHANNEL_STYLES[ch].idle
                            }`}
              >
                <input
                  type="checkbox"
                  checked={channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                  className="sr-only"                            // visually hidden — label provides the hit area
                />
                {ch}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Message (optional) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="message" className="text-sm font-medium text-slate-700">
            Tell us your ops challenge <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Double-books between Airbnb and Booking.com are killing us during peak season…"
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900
                       placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                       focus:border-emerald-500 transition-all duration-150 resize-none"
          />
        </div>

        {/* Error feedback */}
        {error && (
          <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold
                     text-base transition-all duration-150 hover:scale-105 disabled:opacity-50
                     disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? "Sending…" : "Request Early Access →"}
        </button>

        {/* Privacy / license note */}
        <p className="text-center text-xs text-slate-400">
          BUSL 1.1 licensed · Source visible on{" "}
          <a href="https://github.com/deepan-mehta-analytics/stayops" target="_blank" rel="noopener noreferrer"
             className="underline hover:text-slate-600">GitHub</a>
          {" "}· Non-commercial evaluation permitted
        </p>

      </form>
    </div>
  );
}
