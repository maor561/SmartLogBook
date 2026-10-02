import { notFound } from 'next/navigation';
import { summarizeOfp } from '@/lib/ofp';
import { DEFAULTS } from '@/lib/rates/params';
import type { Base, FormView, TrackerDoc } from '@/lib/flight-view';
import { IdleView, PlanView } from '../flight/IdlePlan';
import { LiveView } from '../flight/LiveView';
import { CompletionForm } from '../flight/CompletionForm';
import { TerminalScreen } from '../flight/TerminalScreen';
import { FleetView } from '../fleet/FleetView';
import { nextChecks } from '@/lib/maintenance';
import type { FleetAircraft, Repair } from '@/lib/fleet';
import { Logbook } from '../logbook/Logbook';
import { AnalysisView } from '../analysis/AnalysisView';
import { inRange, rangeOf } from '@/lib/analysis';
import { NO_FILTERS, type LogFlight } from '@/lib/logbook-filter';

const L = (o: Partial<LogFlight> & Pick<LogFlight, 'id' | 'date' | 'origin' | 'dest'>): LogFlight => ({
  callsign: 'ELY351', plannedDest: o.dest, aircraft: 'B738', reg: '4X-EKA', source: 'tracked', timesSource: 'vvvv',
  times: { out: '2026-09-23T13:04:00Z', off: '2026-09-23T13:18:00Z', on: '2026-09-23T14:54:00Z', in: '2026-09-23T15:02:00Z' },
  sched: { out: '2026-09-23T13:00:00Z', off: '2026-09-23T13:12:00Z', on: '2026-09-23T14:48:00Z', in: '2026-09-23T14:56:00Z' },
  blockMin: 118, airMin: 96, fpm: -142, pax: 171, seats: 189, cargoKg: 2310, distanceNm: 651, profitCents: 3842000,
  lines: [
    { code: 'tickets', cents: 4120000, source: 'auto' }, { code: 'cargo', cents: 610000, source: 'auto' },
    { code: 'fuel', cents: -561000, source: 'manual' }, { code: 'ground_handling', cents: -142000, source: 'manual' },
    { code: 'catering', cents: -201000, source: 'manual' }, { code: 'crew', cents: -109000, source: 'auto' },
  ],
  rateSetId: 2, closedAt: '2026-09-23T15:10:00Z', editedAt: null, crewFrom: 'LGAV', editable: true, ...o,
});
const LOG: LogFlight[] = [
  L({ id: 6, date: '2026-09-23T15:02:00Z', origin: 'LGAV', dest: 'LLBG' }),
  L({ id: 5, date: '2026-09-21T15:51:00Z', origin: 'LLBG', dest: 'LGAV', callsign: 'ELY350', profitCents: 2950000 }),
  L({ id: 4, date: '2026-09-20T10:32:00Z', origin: 'LCLK', dest: 'LLBG', source: 'manual', timesSource: 'mmmm', callsign: 'ELY212', fpm: -388, profitCents: 1712000 }),
  L({ id: 3, date: '2026-09-14T13:04:00Z', origin: 'LTFM', dest: 'LLBG', source: 'partial', timesSource: 'vvmm', fpm: -455, profitCents: -421000,
      lines: [{ code: 'tickets', cents: 1820000, source: 'auto' }, { code: 'positioning', cents: -745000, source: 'auto' }, { code: 'hard_landing', cents: -118500, source: 'auto' }] }),
  L({ id: 2, date: '2026-09-11T16:58:00Z', origin: 'LLBG', dest: 'LGTS', plannedDest: 'LGAV', editedAt: '2026-09-12T08:00:00Z',
      lines: [{ code: 'tickets', cents: 4050000, source: 'auto' }, { code: 'diversion', cents: -972000, source: 'auto' }] }),
  L({ id: 1, date: '2026-06-02T15:23:00Z', origin: 'LLBG', dest: 'EGLL', aircraft: 'A21N', source: 'historical', timesSource: null, editable: false,
      times: { out: null, off: null, on: null, in: null }, blockMin: 290, airMin: 290, lines: [{ code: 'legacy_profit', cents: 8890000, source: 'legacy' }], profitCents: 8890000 }),
];
const APS = { LLBG: { lat: 32.0114, lon: 34.8867, name: 'Tel Aviv' }, LGAV: { lat: 37.9364, lon: 23.9445, name: 'Athens' }, LCLK: { lat: 34.875, lon: 33.6249, name: 'Larnaca' },
  LTFM: { lat: 41.2608, lon: 28.7418, name: 'Istanbul' }, LGTS: { lat: 40.5197, lon: 22.9709, name: 'Thessaloniki' }, EGLL: { lat: 51.4706, lon: -0.4619, name: 'London' } };

// Development only: every flight-screen state with fixture data, so the UI can
// be checked without a database or a live flight. 404 in production.
const OFP = summarizeOfp({
  params: { request_id: 'dev-1', time_generated: String(Math.floor(Date.UTC(2026, 8, 25, 13, 31) / 1000)), units: 'kgs' },
  atc: { callsign: 'ELY351' },
  origin: { icao_code: 'LLBG', pos_lat: '32.0114', pos_long: '34.8867', elevation: '135' },
  destination: { icao_code: 'LGAV', pos_lat: '37.9364', pos_long: '23.9445', elevation: '308' },
  alternate: { icao_code: 'LGTS' }, general: { route_distance: '651', gc_distance: '640' },
  aircraft: { icao_code: 'B738', reg: '4X-EKA', max_passengers: '189' },
  weights: { max_tow: '79000', max_ldw: '66361', oew: '42264', pax_count: '162', freight_added: '2140', payload: '19000' },
  times: { sched_out: String(Date.UTC(2026, 8, 25, 14, 0) / 1000), sched_off: String(Date.UTC(2026, 8, 25, 14, 14) / 1000), sched_on: String(Date.UTC(2026, 8, 25, 15, 52) / 1000), sched_in: String(Date.UTC(2026, 8, 25, 15, 59) / 1000), orig_timezone: '3' },
})!;

const base: Base = {
  settings: { simbriefId: 'MAOR561', vatsimCid: 1242058, homeBaseIcao: 'LLBG', homeBaseName: 'Ben Gurion', currentRateSetId: 2 },
  crew: { icao: 'LLBG', name: 'Tel Aviv', since: '2026-09-23T16:44:00.000Z' },
  recent: [
    { id: 3, date: '2026-09-23T16:44:00Z', origin: 'LGAV', dest: 'LLBG', aircraft: 'B738', blockMin: 112, fpm: -142, profitCents: 3842000, source: 'tracked', diverted: false },
    { id: 2, date: '2026-09-20T10:00:00Z', origin: 'LCLK', dest: 'LLBG', aircraft: 'B738', blockMin: 61, fpm: -388, profitCents: 1712000, source: 'manual', diverted: false },
    { id: 1, date: '2026-09-14T10:00:00Z', origin: 'LTFM', dest: 'LLBG', aircraft: 'B738', blockMin: 118, fpm: -455, profitCents: -421000, source: 'partial', diverted: true },
  ],
  month: { label: 'ספטמבר 2026', profitCents: 21248000, flights: 9, blockMin: 1300 },
  tracker: null, trackerError: null,
  nextMilestone: { name: 'שעות בלוק', unit: 'h', current: 487.6, next: 500 },
};

const T0: TrackerDoc = {
  state: 'airborne', ofp: OFP, done_ofp_id: null,
  out_at: '2026-09-25T14:02:00.000Z', off_at: '2026-09-25T14:15:00.000Z', on_at: null, in_at: null,
  landing: null, last: { lat: 35.2, lon: 29.1, alt_ft: 36000, gs_kt: 452, hdg: 297, squawk: '4721', callsign: 'ELY351' },
  last_seen_at: new Date().toISOString(), prev_state: null, disconnected_at: null, joined: null,
};

const form = (o: Partial<FormView> = {}): FormView => ({
  mode: 'tracked', ofp: OFP,
  tracked: { out: '2026-09-25T14:02:00.000Z', off: '2026-09-25T14:15:00.000Z', on: '2026-09-25T15:49:00.000Z', in: '2026-09-25T15:58:00.000Z' },
  actual: { icao: 'LGAV', name: 'Athens' }, diverted: false, diversionNm: null, positioningNm: 0,
  params: DEFAULTS, rateSetId: 2, fuel: { usdPerKg: 1.5137, week: '2026-09-18' }, rating: 3.8, trackerState: 'arrived', disconnectedAt: null, draft: { fuel: 6120, ground: 1480, catering: 2050 }, aircraft: null, ...o,
});

// Fleet fixtures (ADR-060). `REPAIR` is an open request: N738PM is grounded for another 3 days and 21 hours.
const serverNow = () => Date.now();
const repairFixture = (): Repair => ({
  id: 1, flightId: 6, registration: '4X-EKA', tier: 'amm', fpm: -655, cents: 474000, createdAt: new Date(serverNow() - 3 * 3600e3).toISOString(),
  dueAt: new Date(serverNow() + (3 * 24 + 21) * 3600e3).toISOString(), paidAt: null, paidHow: null, callsign: 'ELY352', origin: 'LGAV', dest: 'LLBG',
});
const fleetFixture = (grounded: boolean): FleetAircraft[] => {
  const r = repairFixture(), at = new Date(serverNow() - 3 * 3600e3).toISOString();
  return [
    { reg: '4X-EKA', type: 'B738', mtowT: 79, airHours: 100.9, flights: 32, hardLandings: 1, spentCents: 1501000, open: grounded ? r : null, checks: nextChecks(DEFAULTS, 100.9, 79),
      history: [
        { what: 'repair', kind: 'amm', fpm: -655, cents: 474000, at, state: grounded ? 'open' : 'manual', dueAt: r.dueAt, flightId: 6, callsign: 'ELY352', origin: 'LGAV', dest: 'LLBG' },
        { what: 'check', kind: 'light', fpm: null, cents: 1501000, at, state: 'closing', dueAt: null, flightId: 5, callsign: 'ELY351', origin: 'LLBG', dest: 'LGAV' },
      ] },
    { reg: '4X-EKB', type: 'B738', mtowT: 79, airHours: 41.2, flights: 14, hardLandings: 0, spentCents: 0, open: null, checks: nextChecks(DEFAULTS, 41.2, 79), history: [] },
  ];
};

// Server-side clock for the terminal fixture (a whole minute, so reloads agree).
const minutesFromNow = (min: number) => new Date(Math.round((Date.now() + min * 60e3) / 60e3) * 60e3).toISOString();

export default async function DevPreview({ searchParams }: PageProps<'/dev-preview'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  const s = (await searchParams).s ?? 'idle';
  const lostAt = new Date(Date.parse(T0.last_seen_at!) - 11 * 60e3).toISOString();
  switch (s) {
    case 'plan': return <PlanView base={base} ofp={OFP} expiresInMin={702} positioningNm={0} />;
    case 'live': return <LiveView initial={T0} ofp={OFP} draft={{ fuel: 8568, ground: null, catering: 725 }} />;
    case 'disc': return <LiveView initial={{ ...T0, state: 'disconnected', prev_state: 'airborne', disconnected_at: lostAt }} ofp={OFP} draft={null} />;
    case 'done': return <CompletionForm form={form()} crewIcao="LLBG" />;
    case 'divert': return <CompletionForm form={form({ actual: { icao: 'LGTS', name: 'Thessaloniki' }, diverted: true, diversionNm: 160 })} crewIcao="LLBG" />;
    case 'manual': return <CompletionForm form={form({ mode: 'manual', trackerState: 'interrupted', disconnectedAt: '2026-09-25T15:13:00.000Z', tracked: { out: '2026-09-25T14:02:00.000Z', off: '2026-09-25T14:15:00.000Z', on: null, in: null }, actual: null })} crewIcao="LLBG" />;
    case 'analysis': {
      const r = rangeOf('m', '2026-09-15');
      const pnl: Record<string, number> = {};
      for (const f of LOG.filter((x) => x.source !== 'historical' && inRange(x, r))) for (const l of f.lines) pnl[l.code] = (pnl[l.code] ?? 0) + l.cents;
      return <AnalysisView kind="m" anchor="2026-09-15" hist={false} from="" to="" flights={LOG} pnl={pnl}
        achieved={[{ cat: 'flights', threshold: 10, at: '2026-09-21T15:51:00Z', flightId: 5 }]} />;
    }
    case 'logbook': return <Logbook flights={LOG} airports={APS} home="LLBG" initial={NO_FILTERS} />;
    case 'terminal': {
      // ?min=50 → PUSHBACK in 50 minutes (negative: already past); ?size=large|medium|small
      const sp = await searchParams, min = Number(sp.min ?? 50);
      const out = minutesFromNow(min);
      const type = `${sp.size ?? 'large'}_airport`;
      return <TerminalScreen ofp={{ ...OFP, sched: { ...OFP.sched, out } }} tag={<span className="tag plan">תוכנית מוכנה</span>} airportType={type} />;
    }
    case 'closed': return <IdleView base={base} justClosed />;     // right after closing a flight
    case 'fleet': return <FleetView fleet={fleetFixture((await searchParams).g !== '0')} now={serverNow()} />;
    // the flight that crosses 100 air hours: the light check is charged at closing
    case 'check': return <CompletionForm form={form({ aircraft: { reg: '4X-EKA', airHours: 99.2, grounded: null, checks: nextChecks(DEFAULTS, 99.2, 79) } })} crewIcao="LLBG" />;
    case 'grounded': return <CompletionForm form={form({ aircraft: { reg: '4X-EKA', airHours: 100.9, grounded: repairFixture(), checks: nextChecks(DEFAULTS, 100.9, 79) } })} crewIcao="LLBG" />;
    case 'plan-grounded': return <PlanView base={base} ofp={OFP} expiresInMin={702} positioningNm={0} aircraft={{ reg: '4X-EKA', airHours: 100.9, grounded: repairFixture(), checks: nextChecks(DEFAULTS, 100.9, 79) }} />;
    case 'plan-check': return <PlanView base={base} ofp={OFP} expiresInMin={702} positioningNm={0} aircraft={{ reg: '4X-EKA', airHours: 99.2, grounded: null, checks: nextChecks(DEFAULTS, 99.2, 79) }} />;
    default: return <IdleView base={base} />;
  }
}
