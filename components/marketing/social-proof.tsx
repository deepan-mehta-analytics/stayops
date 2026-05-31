// ── Social proof — single testimonial card ────────────────
export function SocialProof() {
  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Testimonial card */}
        <div className="bg-white rounded-2xl border-l-4 border-emerald-500 p-8 shadow-sm">

          {/* Star rating */}
          <div className="flex gap-1 mb-4" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-slate-700 text-lg leading-relaxed mb-6">
            &ldquo;Built to handle the exact chaos we see every peak season — double-books showing up across
            Airbnb and Booking.com at 11 pm. This is the tool I needed before last Diwali.&rdquo;
          </blockquote>

          {/* Attribution */}
          <cite className="not-italic">
            <span className="font-semibold text-slate-900 text-sm">Multi-property operator, Goa</span>
            <span className="text-slate-400 text-sm ml-2">— beta tester</span>
          </cite>

        </div>
      </div>
    </section>
  );
}
