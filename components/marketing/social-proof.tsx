"use client";                                                          // modal state requires client component

import { useState, useEffect } from "react";                           // modal open/close state + keyboard escape

// ── Review data ────────────────────────────────────────────────────────
const REVIEWS = [
  {
    quote: "Built to handle the exact chaos we see every peak season — double-books showing up across Airbnb and Booking.com at 11 pm. This is the tool I needed before last Diwali.",
    author: "Multi-property operator",
    location: "Goa",
    tag: "beta tester",
    stars: 5,
  },
  {
    quote: "The AI conflict resolution alone saved us from a nightmare double-booking during a wedding season. It flagged the issue, explained the clash, and suggested the fix in seconds.",
    author: "STR host",
    location: "Mumbai",
    tag: "4 properties",
    stars: 5,
  },
  {
    quote: "CSV import with automatic dedup was a game-changer. We were managing bookings in four different spreadsheets — now everything reconciles in one place without manual cross-checking.",
    author: "Villa manager",
    location: "Kerala",
    tag: "12 villas",
    stars: 4,
  },
  {
    quote: "The live KPI dashboard shows occupancy, ADR, and open conflicts in one view. Before this I was pulling numbers from three different channel portals every morning.",
    author: "Airbnb Superhost",
    location: "Delhi NCR",
    tag: "6 properties",
    stars: 5,
  },
  {
    quote: "Weekly AI reports land in Slack every Monday before I wake up. The summary catches things I would have missed — price mismatches, gap nights between bookings, underperforming properties.",
    author: "Property manager",
    location: "Bangalore",
    tag: "9 units",
    stars: 5,
  },
  {
    quote: "Turnover scheduling used to be a manual WhatsApp chain. Now the system auto-assigns cleaning slots from checkout data. Staff know where to be without a single message from me.",
    author: "Resort operator",
    location: "Rajasthan",
    tag: "20+ rooms",
    stars: 4,
  },
];

// ── Star rating component ───────────────────────────────────────────────
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (           // render 5 stars, filled up to count
        <svg
          key={i}
          className={`w-4 h-4 fill-current ${i < count ? "text-amber-400" : "text-slate-200"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ── Single review card ─────────────────────────────────────────────────
function ReviewCard({ review }: { review: typeof REVIEWS[number] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-4 border-l-emerald-500 p-6 shadow-sm flex flex-col gap-4">
      <StarRating count={review.stars} />                              {/* star rating row */}
      <blockquote className="text-slate-700 text-sm leading-relaxed flex-1">
        &ldquo;{review.quote}&rdquo;
      </blockquote>
      <cite className="not-italic flex items-center justify-between">
        <span className="font-semibold text-slate-900 text-sm">
          {review.author}, {review.location}
        </span>
        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
          {review.tag}
        </span>
      </cite>
    </div>
  );
}

// ── Reviews modal ──────────────────────────────────────────────────────
function ReviewsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;                                                  // only add listener when modal is open
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; // close on Escape
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);   // cleanup on unmount
  }, [open, onClose]);

  if (!open) return null;                                               // render nothing when closed

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="All operator reviews"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}                                               // click outside to close
      />

      {/* Panel */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-lg">What operators say</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400
                       hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close reviews"
          >
            ✕
          </button>
        </div>

        {/* Scrollable card grid */}
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {REVIEWS.map((r) => (
              <ReviewCard key={`${r.author}-${r.location}`} review={r} />  // unique key per operator
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Section export ─────────────────────────────────────────────────────
export function SocialProof() {
  const [modalOpen, setModalOpen] = useState(false);                   // controls reviews modal visibility

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* Section heading */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">What operators say</h2>
          <p className="text-slate-500 text-sm mt-1">Early access feedback from multi-property STR operators across India</p>
        </div>

        {/* Card grid — auto-fill: fills horizontally, wraps to next row when full */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {REVIEWS.map((r) => (
            <ReviewCard key={`${r.author}-${r.location}`} review={r} />
          ))}
        </div>

        {/* Read more button — right-aligned, opens modal */}
        <div className="flex justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                       border border-emerald-500 text-emerald-600 text-sm font-medium
                       hover:bg-emerald-50 transition-colors"
          >
            All reviews
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />  {/* chevron right */}
            </svg>
          </button>
        </div>

      </div>

      {/* Reviews modal */}
      <ReviewsModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
