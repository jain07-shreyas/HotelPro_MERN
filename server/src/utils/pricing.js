const DAY = 86400000;
const round2 = (n) => Math.round(n * 100) / 100;
const utcDay = (d) => {
  const x = new Date(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
};

// Number of nights between two dates (calendar days, UTC). 0 when check-out is not after check-in.
export const countNights = (checkIn, checkOut) => Math.max(0, Math.round((utcDay(checkOut) - utcDay(checkIn)) / DAY));

/**
 * Price a stay night by night.
 * seasons: [{ name, startDate, endDate, multiplier, categories?: string[], isActive? }]
 * A season applies to every night from startDate to endDate (both inclusive). If several seasons overlap
 * on the same night, the one with the highest multiplier wins.
 * Returns { nights, total, averageRate, breakdown: [{ from, nights, rate, label }] }
 */
export function calculateStay(room, checkIn, checkOut, seasons = []) {
  const nights = countNights(checkIn, checkOut);
  if (nights < 1) return { nights: 0, total: 0, averageRate: 0, breakdown: [] };

  const base = Number(room.pricePerNight);
  const start = utcDay(checkIn);
  const nightly = [];

  for (let i = 0; i < nights; i++) {
    const day = start + i * DAY;
    let best = null;
    for (const s of seasons) {
      if (s.isActive === false) continue;
      if (s.categories?.length && !s.categories.includes(room.category)) continue;
      if (day < utcDay(s.startDate) || day > utcDay(s.endDate)) continue;
      if (!best || s.multiplier > best.multiplier) best = s;
    }
    nightly.push({ day, rate: round2(base * (best ? best.multiplier : 1)), label: best ? best.name : null });
  }

  const breakdown = [];
  for (const n of nightly) {
    const last = breakdown[breakdown.length - 1];
    if (last && last.rate === n.rate && last.label === n.label) last.nights += 1;
    else breakdown.push({ from: n.day, nights: 1, rate: n.rate, label: n.label });
  }
  breakdown.forEach((b) => (b.from = new Date(b.from).toISOString().slice(0, 10)));

  const total = round2(nightly.reduce((sum, n) => sum + n.rate, 0));
  return { nights, total, averageRate: round2(total / nights), breakdown };
}
