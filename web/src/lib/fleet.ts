import 'server-only';
import { db } from './db';
import type { RateParams } from './rates/params';
import { nextChecks, type NextCheck } from './maintenance';
import {
  AIRFRAME_HOURS_SQL, FLEET_SQL, HISTORY_SQL, OPEN_REPAIR_SQL, OPEN_REPAIRS_COUNT_SQL, PAY_REPAIR_SQL, SETTLE_OVERDUE_SQL,
} from './maintenance-sql';

// Fleet and repair requests (sketch s12, ADR-060), read from Neon.

export type Repair = {
  id: number; flightId: number; registration: string; tier: string; fpm: number | null; cents: number;
  createdAt: string; dueAt: string; paidAt: string | null; paidHow: 'manual' | 'auto' | null;
  callsign: string | null; origin: string; dest: string;
};
type Row = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const toRepair = (r: Row): Repair => ({
  id: r.id as number, flightId: r.flight_id as number, registration: r.registration as string, tier: r.tier as string,
  fpm: r.fpm as number | null, cents: Number(r.amount_cents), createdAt: iso(r.created_at)!, dueAt: iso(r.due_at)!,
  paidAt: iso(r.paid_at), paidHow: (r.paid_how as Repair['paidHow']) ?? null,
  callsign: r.callsign as string | null, origin: trim(r.origin_icao), dest: trim(r.dest_icao),
});

// Unpaid requests past their 4 days are charged by themselves. Called before anything reads the ledger.
export async function settleOverdueRepairs() {
  await db().query(SETTLE_OVERDUE_SQL, [new Date().toISOString()]);
}

export async function airframeHours(reg: string): Promise<number> {
  const [r] = (await db().query(AIRFRAME_HOURS_SQL, [reg])) as Row[];
  return Math.round(Number(r?.hours ?? 0) * 100) / 100;
}

export async function openRepair(reg: string): Promise<Repair | null> {
  const [r] = (await db().query(OPEN_REPAIR_SQL, [reg])) as Row[];
  return r ? toRepair(r) : null;
}

export async function openRepairsCount(): Promise<number> {
  const [r] = (await db().query(OPEN_REPAIRS_COUNT_SQL, [])) as Row[];
  return Number(r?.n ?? 0);
}

export async function payRepair(id: number): Promise<boolean> {
  const rows = (await db().query(PAY_REPAIR_SQL, [id])) as Row[];
  return rows.length > 0;
}

// What the flight screen needs about the aircraft in the plan.
export type AircraftStatus = { reg: string; airHours: number; grounded: Repair | null; checks: NextCheck[] };
export async function aircraftStatus(reg: string | null, mtowKg: number | null, params: RateParams): Promise<AircraftStatus | null> {
  if (!reg) return null;
  await settleOverdueRepairs();
  const [airHours, grounded] = await Promise.all([airframeHours(reg), openRepair(reg)]);
  return { reg, airHours, grounded, checks: nextChecks(params, airHours, (mtowKg ?? 0) / 1000) };
}

export type FleetEvent = {
  what: 'check' | 'repair'; kind: string; fpm: number | null; cents: number; at: string;
  state: 'closing' | 'open' | 'manual' | 'auto'; dueAt: string | null;
  flightId: number; callsign: string | null; origin: string; dest: string;
};
export type FleetAircraft = {
  reg: string; type: string | null; mtowT: number; airHours: number; flights: number; hardLandings: number;
  spentCents: number;                       // checks and repairs already in the ledger
  open: Repair | null; checks: NextCheck[]; history: FleetEvent[];
};

export async function loadFleet(): Promise<FleetAircraft[]> {
  await settleOverdueRepairs();
  const [cur] = await db()`SELECT rs.params FROM settings s JOIN rate_sets rs ON rs.id = s.current_rate_set_id WHERE s.id = 1`;
  const params = cur.params as RateParams;
  const [rows, hist] = await Promise.all([
    db().query(FLEET_SQL, [params.hardLanding.freeUpToFpm]) as Promise<Row[]>,
    db().query(HISTORY_SQL, []) as Promise<Row[]>,
  ]);
  const events = hist.map((h) => ({
    reg: h.registration as string,
    e: {
      what: h.what as FleetEvent['what'], kind: h.kind as string, fpm: h.fpm as number | null, cents: Number(h.amount_cents), at: iso(h.at)!,
      state: h.state as FleetEvent['state'], dueAt: iso(h.due_at),
      flightId: h.flight_id as number, callsign: h.callsign as string | null, origin: trim(h.origin_icao), dest: trim(h.dest_icao),
    } satisfies FleetEvent,
  }));
  return Promise.all(rows.map(async (r) => {
    const reg = r.registration as string, mtowT = Number(r.mtow_kg ?? 0) / 1000, airHours = Math.round(Number(r.air_hours) * 10) / 10;
    const history = events.filter((x) => x.reg === reg).map((x) => x.e);
    return {
      reg, type: r.aircraft_type as string | null, mtowT, airHours, flights: r.flights as number, hardLandings: r.hard_landings as number,
      spentCents: history.filter((e) => e.state !== 'open').reduce((s, e) => s + e.cents, 0),
      open: history.some((e) => e.state === 'open') ? await openRepair(reg) : null,
      checks: nextChecks(params, airHours, mtowT), history,
    };
  }));
}
