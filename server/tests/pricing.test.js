import test from "node:test";
import assert from "node:assert/strict";
import { calculateStay, countNights } from "../src/utils/pricing.js";

const room = { pricePerNight: 100, category: "Deluxe" };

test("countNights counts calendar days", () => {
  assert.equal(countNights("2026-12-01", "2026-12-04"), 3);
  assert.equal(countNights("2026-12-01", "2026-12-01"), 0);
  assert.equal(countNights("2026-12-05", "2026-12-01"), 0);
});

test("no seasons: nights x base price", () => {
  const r = calculateStay(room, "2026-12-01", "2026-12-04");
  assert.equal(r.nights, 3);
  assert.equal(r.total, 300);
  assert.equal(r.averageRate, 100);
  assert.equal(r.breakdown.length, 1);
});

test("season applies only to nights inside its range (inclusive)", () => {
  const seasons = [{ name: "Christmas", startDate: "2026-12-24", endDate: "2026-12-26", multiplier: 1.5 }];
  // nights: 23 (normal), 24, 25, 26 (season)
  assert.equal(calculateStay(room, "2026-12-23", "2026-12-27").total, 400); // without the season
  const r2 = calculateStay(room, "2026-12-23", "2026-12-27", seasons);
  assert.equal(r2.total, 550);
  assert.equal(r2.breakdown.length, 2);
  assert.equal(r2.breakdown[1].label, "Christmas");
  assert.equal(r2.breakdown[1].nights, 3);
});

test("category-specific season is ignored for other categories", () => {
  const seasons = [{ name: "Suites only", startDate: "2026-01-01", endDate: "2026-12-31", multiplier: 2, categories: ["Presidential Suite"] }];
  assert.equal(calculateStay(room, "2026-06-01", "2026-06-03", seasons).total, 200);
  assert.equal(calculateStay({ ...room, category: "Presidential Suite" }, "2026-06-01", "2026-06-03", seasons).total, 400);
});

test("highest multiplier wins when seasons overlap; inactive seasons are ignored", () => {
  const seasons = [
    { name: "A", startDate: "2026-06-01", endDate: "2026-06-30", multiplier: 1.2 },
    { name: "B", startDate: "2026-06-01", endDate: "2026-06-30", multiplier: 1.5 },
    { name: "C", startDate: "2026-06-01", endDate: "2026-06-30", multiplier: 3, isActive: false },
  ];
  const r = calculateStay(room, "2026-06-10", "2026-06-12", seasons);
  assert.equal(r.total, 300);
  assert.equal(r.breakdown[0].label, "B");
});

test("discount seasons lower the price and totals are rounded to cents", () => {
  const seasons = [{ name: "Off season", startDate: "2026-02-01", endDate: "2026-02-28", multiplier: 0.85 }];
  const r = calculateStay({ pricePerNight: 99.99, category: "Standard" }, "2026-02-10", "2026-02-13", seasons);
  assert.equal(r.nights, 3);
  assert.equal(r.total, 254.97); // 84.99 per night (84.9915 rounded) x 3
});

test("invalid range returns an empty quote", () => {
  assert.deepEqual(calculateStay(room, "2026-12-05", "2026-12-01"), { nights: 0, total: 0, averageRate: 0, breakdown: [] });
});
