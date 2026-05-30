// ── Unit tests for the pure reconciliation classifier ──────
import { describe, it, expect } from "vitest";                 // test primitives
import { classifyBookings, type BookingForRecon } from "@/lib/reconciliation"; // function under test + row type

// Factory: a booking with sane defaults; override only what each test needs
function booking(
  o: Partial<BookingForRecon> & Pick<BookingForRecon, "id" | "checkIn" | "checkOut">
): BookingForRecon {
  return {
    propertyId: "p1",                 // default property
    propertyName: "Maple Loft",       // default property name
    baseRate: "200",                  // Drizzle numeric arrives as a string
    guestName: "Guest A",             // default guest
    nightlyRate: null,                // no price-mismatch unless set
    sourceRowHash: null,              // distinct hashes only where duplicate is tested
    ...o,
  };
}

describe("classifyBookings", () => {
  it("flags a double_book for overlapping different guests", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-05" }),
      booking({ id: "b", guestName: "Bob",   checkIn: "2026-06-03", checkOut: "2026-06-07" }),
    ]);
    expect(flags.filter((f) => f.type === "double_book")).toHaveLength(1);
  });

  it("flags a duplicate for identical bookings from two channels", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-04", sourceRowHash: "h1" }),
      booking({ id: "b", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-04", sourceRowHash: "h2" }),
    ]);
    expect(flags.filter((f) => f.type === "duplicate")).toHaveLength(1);
  });

  it("flags a 1-night gap as orphan_night with no estimatedValue", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-03" }),
      booking({ id: "b", guestName: "Bob",   checkIn: "2026-06-04", checkOut: "2026-06-06" }),
    ]);
    const orphans = flags.filter((f) => f.type === "orphan_night");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].estimatedValue).toBeUndefined();
  });

  it("flags a 2-night gap as gap with estimatedValue = 2 * baseRate", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-03", baseRate: "200" }),
      booking({ id: "b", guestName: "Bob",   checkIn: "2026-06-05", checkOut: "2026-06-07", baseRate: "200" }),
    ]);
    const gaps = flags.filter((f) => f.type === "gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0].estimatedValue).toBe(400);
  });

  it("does not flag a 4-night gap (intentional vacancy)", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-03" }),
      booking({ id: "b", guestName: "Bob",   checkIn: "2026-06-07", checkOut: "2026-06-09" }),
    ]);
    expect(flags.filter((f) => f.type === "gap" || f.type === "orphan_night")).toHaveLength(0);
  });

  it("sums estimatedValue across multiple opportunities correctly", () => {
    const flags = classifyBookings([
      booking({ id: "a", propertyId: "p1", propertyName: "Loft",  guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-03", baseRate: "200" }),
      booking({ id: "b", propertyId: "p1", propertyName: "Loft",  guestName: "Bob",   checkIn: "2026-06-05", checkOut: "2026-06-07", baseRate: "200" }),
      booking({ id: "c", propertyId: "p2", propertyName: "Cabin", guestName: "Carol", checkIn: "2026-06-01", checkOut: "2026-06-03", baseRate: "200" }),
      booking({ id: "d", propertyId: "p2", propertyName: "Cabin", guestName: "Dave",  checkIn: "2026-06-06", checkOut: "2026-06-08", baseRate: "200" }),
    ]);
    const total = flags
      .filter((f) => f.type === "gap")
      .reduce((sum, f) => sum + Number(f.estimatedValue), 0);
    expect(total).toBe(1000); // p1: 2*200=400, p2: 3*200=600
  });

  it("flags a price_mismatch when nightly rate deviates >25% from base", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-03", baseRate: "200", nightlyRate: "300" }),
    ]);
    expect(flags.filter((f) => f.type === "price_mismatch")).toHaveLength(1);
  });

  it("produces no flags for back-to-back bookings at base rate", () => {
    const flags = classifyBookings([
      booking({ id: "a", guestName: "Alice", checkIn: "2026-06-01", checkOut: "2026-06-03", baseRate: "200", nightlyRate: "200" }),
      booking({ id: "b", guestName: "Bob",   checkIn: "2026-06-03", checkOut: "2026-06-05", baseRate: "200", nightlyRate: "200" }),
    ]);
    expect(flags).toHaveLength(0);
  });
});
