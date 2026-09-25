import { notFound } from 'next/navigation';
import { summarizeOfp } from '@/lib/ofp';
import { DEFAULTS } from '@/lib/rates/params';
import type { Base, FormView, TrackerDoc } from '@/lib/flight-view';
import { IdleView, PlanView } from '../flight/IdlePlan';
import { LiveView } from '../flight/LiveView';
import { CompletionForm } from '../flight/CompletionForm';

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
  params: DEFAULTS, rateSetId: 2, fuel: { usdPerKg: 1.5137, week: '2026-09-18' }, trackerState: 'arrived', disconnectedAt: null, ...o,
});

export default async function DevPreview({ searchParams }: PageProps<'/dev-preview'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  const s = (await searchParams).s ?? 'idle';
  const lostAt = new Date(Date.parse(T0.last_seen_at!) - 11 * 60e3).toISOString();
  switch (s) {
    case 'plan': return <PlanView base={base} ofp={OFP} expiresInMin={702} positioningNm={0} />;
    case 'live': return <LiveView initial={T0} ofp={OFP} />;
    case 'disc': return <LiveView initial={{ ...T0, state: 'disconnected', prev_state: 'airborne', disconnected_at: lostAt }} ofp={OFP} />;
    case 'done': return <CompletionForm form={form()} crewIcao="LLBG" />;
    case 'divert': return <CompletionForm form={form({ actual: { icao: 'LGTS', name: 'Thessaloniki' }, diverted: true, diversionNm: 160 })} crewIcao="LLBG" />;
    case 'manual': return <CompletionForm form={form({ mode: 'manual', trackerState: 'interrupted', disconnectedAt: '2026-09-25T15:13:00.000Z', tracked: { out: '2026-09-25T14:02:00.000Z', off: '2026-09-25T14:15:00.000Z', on: null, in: null }, actual: null })} crewIcao="LLBG" />;
    default: return <IdleView base={base} />;
  }
}
