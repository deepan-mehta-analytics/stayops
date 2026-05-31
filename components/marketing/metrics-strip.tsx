"use client";                                                    // IntersectionObserver + useState are client-only
import { useEffect, useRef, useState } from "react";            // hooks for intersection + animation state

// ── Single animated counter ───────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount]   = useState(0);                      // displayed number
  const [started, setStarted] = useState(false);                // whether animation has begun
  const ref = useRef<HTMLSpanElement>(null);                    // DOM ref for IntersectionObserver

  useEffect(() => {
    const el = ref.current;                                      // get the DOM element
    if (!el) return;                                             // bail if not mounted yet

    // Observe when counter enters viewport
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); }, // trigger once
      { threshold: 0.3 }                                        // fire when 30% visible
    );
    observer.observe(el);                                        // start observing the span
    return () => observer.disconnect();                         // cleanup on unmount
  }, [started]);

  useEffect(() => {
    if (!started) return;                                        // wait for intersection trigger

    const duration  = 1200;                                      // total animation duration ms
    const startTime = performance.now();                         // animation start timestamp

    function tick(now: number) {
      const elapsed  = now - startTime;                         // ms since start
      const progress = Math.min(elapsed / duration, 1);         // 0→1 clamped
      const eased    = 1 - Math.pow(1 - progress, 3);          // ease-out cubic
      setCount(Math.round(eased * target));                     // update displayed number
      if (progress < 1) requestAnimationFrame(tick);            // continue until done
    }

    requestAnimationFrame(tick);                                 // kick off animation loop
  }, [started, target]);

  return (
    <span ref={ref} className="font-[family-name:var(--font-poppins)] font-extrabold text-5xl text-slate-900">
      {count}{suffix}                                           {/* rendered counter value */}
    </span>
  );
}

// ── Metrics data ──────────────────────────────────────────
const metrics = [
  { target: 86, suffix: "+", label: "Bookings synced"         },  // matches seed data
  { target: 5,  suffix: "",  label: "Conflict types detected" },  // 4 rule types + price mismatch
  { target: 3,  suffix: "",  label: "Channels reconciled"     },  // airbnb, booking, direct
];

// ── Full strip component ──────────────────────────────────
export function MetricsStrip() {
  return (
    <section className="border-y border-slate-200 bg-white py-12">
      <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-around gap-10">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-2 text-center">
            <Counter target={m.target} suffix={m.suffix} />
            <span className="text-slate-500 text-sm font-medium">{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
