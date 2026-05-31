// ── Full-width property banner — AI-generated editorial triptych ──────
// Sits at the top of the landing page, fades into the dark hero below.

import Image from "next/image";                                        // Next.js optimised image component

// ── Property type labels shown over the three banner panels ───────────
const PROPERTY_TYPES = [
  { label: "Beach villas",       position: "left-[16%]"  }, // over the ocean villa panel
  { label: "Mountain cabins",    position: "left-[50%]"  }, // over the forest cabin panel
  { label: "City apartments",    position: "left-[82%]"  }, // over the skyline panel
];

export function PropertyBanner() {
  return (
    <section className="relative w-full h-[360px] md:h-[440px] lg:h-[500px] overflow-hidden">

      {/* Full-bleed banner image */}
      <Image
        src="/banner-properties.png"                                   // AI-generated triptych from Gemini
        alt="Beach villa, mountain cabin, and city apartment — the three STR property types StayOps manages"
        fill                                                           // fills the section container
        className="object-cover object-center"                         // cover + centre crop
        priority                                                        // above-the-fold — load immediately
        sizes="100vw"                                                  // always full viewport width
      />

      {/* Top fade — subtle dark vignette so nav text stays readable */}
      <div className="absolute inset-x-0 top-0 h-24
                      bg-gradient-to-b from-slate-950/60 to-transparent pointer-events-none" />

      {/* Bottom fade — blends seamlessly into the dark hero section below */}
      <div className="absolute inset-x-0 bottom-0 h-40
                      bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

      {/* Property type labels — bottom-anchored, one per panel */}
      <div className="absolute bottom-10 inset-x-0">
        {PROPERTY_TYPES.map(({ label, position }) => (
          <span
            key={label}
            className={`absolute -translate-x-1/2 ${position}
                        text-white/80 text-xs font-medium tracking-widest uppercase
                        bg-white/10 backdrop-blur-sm border border-white/20
                        px-3 py-1 rounded-full`}
          >
            {label}
          </span>
        ))}
      </div>

    </section>
  );
}
