// WP9: recalibrates the fare on the real flights (ADR-029, 034).
// Reads a logbook export (.xlsx, its hidden _backup sheet) and works only from the ledger: every
// line as it was written, and the tickets line's own record of how its fare was built
// (base × multipliers × reputation × fuel). Only the distance factor K is varied:
//   fare = round((F0 + K × NM^0.65) × multipliers × (1 + reputation) × (1 + fuel))
// Crew positioning and diversions are priced from the same base, so they move with K too.
//
//   node scripts/calibrate.mjs <export.xlsx> [target margin, default 0.20]
import ExcelJS from 'exceljs';

const [file, targetArg] = process.argv.slice(2);
const target = Number(targetArg ?? 0.2);
const F0 = 40, EXP = 0.65;

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
let payload = '';
wb.getWorksheet('_backup').eachRow((row, i) => { if (i > 1) payload += String(row.getCell(1).value ?? ''); });
const data = JSON.parse(payload);

const flights = data.flights
  .filter((f) => f.status === 'closed' && data.lines.some((l) => l.flight_id === f.id && l.code === 'tickets'))
  .sort((a, b) => Date.parse(a.out_at ?? a.closed_at) - Date.parse(b.out_at ?? b.closed_at));

const base = (k, nm) => F0 + k * Math.pow(nm, EXP);
const usd = (c) => Number(c) / 100;

// One flight at a given K: revenue, costs and profit, from its ledger.
function at(f, k) {
  const lines = data.lines.filter((l) => l.flight_id === f.id);
  let rev = 0, cost = 0;
  const parts = {};
  for (const l of lines) {
    let v = usd(l.amount_cents);
    const c = l.calc ?? {};
    if (l.code === 'tickets' && k != null) {
      const fare = Math.round(base(k, c.distanceNm) * c.clamped * (1 + c.reputation) * (1 + c.surcharge));
      v = fare * c.pax;
    } else if (l.code === 'positioning' && k != null && c.fareEach > 0) v = -c.people * base(k, c.nm);
    else if (l.code === 'diversion' && k != null && !c.bus) v = -c.pax * base(k, c.nm);
    parts[l.code] = (parts[l.code] ?? 0) + v;
    if (v > 0) rev += v; else cost -= v;
  }
  return { rev, cost, profit: rev - cost, parts };
}
const total = (k) => {
  let rev = 0, profit = 0;
  for (const f of flights) { const r = at(f, k); rev += r.rev; profit += r.profit; }
  return { rev, profit, margin: profit / rev };
};
function solve(t) {
  let lo = 0.1, hi = 8;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (total(m).margin < t) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const kNow = (() => {                       // the K the flights were priced with, read back from their base
  const t = data.lines.find((l) => l.code === 'tickets' && flights.some((f) => f.id === l.flight_id)).calc;
  return (t.base - F0) / Math.pow(t.distanceNm, EXP);
})();

const r0 = (x) => Math.round(x);
const rows = flights.map((f) => {
  const now = at(f, null), t = data.lines.find((l) => l.flight_id === f.id && l.code === 'tickets').calc;
  const p = now.parts, c = (code) => -(p[code] ?? 0);
  return {
    date: String(f.out_at ?? f.closed_at).slice(0, 10), flight: `${f.callsign ?? ''} ${f.origin_icao.trim()}-${(f.dest_actual_icao ?? f.dest_planned_icao).trim()}`,
    ac: f.aircraft_type, nm: t.distanceNm, block: f.block_min, pax: t.pax, seats: f.seats, lf: t.lf,
    fare: t.fare, base: r0(t.base), mult: t.clamped, multipliers: t.multipliers, reputation: t.reputation, surcharge: t.surcharge, eia: t.fuelUsdPerKg,
    tickets: r0(p.tickets ?? 0), cargo: r0(p.cargo ?? 0),
    gsx: r0(c('fuel') + c('ground_handling') + c('catering')), fuel: r0(c('fuel')), ground: r0(c('ground_handling')), catering: r0(c('catering')),
    crew: r0(c('crew')), mx: r0(c('maintenance') + c('maintenance_check')), check: r0(c('maintenance_check')),
    fees: r0(c('airport_fees')), nav: r0(c('nav_charges')), lease: r0(c('lease')),
    hard: r0(c('hard_landing')), positioning: r0(c('positioning')), diversion: r0(c('diversion')),
    revenue: r0(now.rev), cost: r0(now.cost), profit: r0(now.profit), margin: +(now.profit / now.rev).toFixed(3),
    perPaxCost: r0(now.cost / t.pax),
  };
});

const out = {
  flights: rows.length, kNow: +kNow.toFixed(3), now: total(kNow),
  kFor: Object.fromEntries([0.1, 0.15, target, 0.25, 0.3].map((t) => [t.toFixed(2), +solve(t).toFixed(3)])),
  rows,
};
console.log(JSON.stringify(out, null, 2));
