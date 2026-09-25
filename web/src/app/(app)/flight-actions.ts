'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db';
import { compute } from '@/lib/engine';
import { getFlightView } from '@/lib/flight-view';
import { missing, sourceOf, timesSource, toEngineInput, type Draft, type Manual, type Times } from '@/lib/flight-input';
import { hasTracker, trackerAck } from '@/lib/tracker';

export type CloseResult = { ok: true } | { ok: false; errors: string[] };

type Payload = { ofpId: string; manualMode: boolean; times: Times; manual: Manual; fpm: number | null };

const money = (v: number | null) => (v != null && Number.isFinite(v) && v >= 0 && v < 10_000_000 ? Math.round(v * 100) / 100 : null);

// Closes the flight (ADR-007, 021): re-derives the view on the server, merges
// only the fields the user may edit, prices it, and writes the flight and all
// its ledger lines in ONE statement. Then tells the tracker to reset.
export async function closeFlight(p: Payload): Promise<CloseResult> {
  await verifySession();
  const view = await getFlightView({ manual: p.manualMode });
  if (view.kind !== 'done' && view.kind !== 'manual') return { ok: false, errors: ['אין טיסה שממתינה להשלמה'] };
  const f = view.form;
  if (f.ofp.id !== p.ofpId) return { ok: false, errors: ['התוכנית השתנתה בינתיים, רענן את הדף'] };

  // Measured times are locked; only the missing ones come from the form.
  const times: Times = { out: null, off: null, on: null, in: null };
  for (const k of ['out', 'off', 'on', 'in'] as const) {
    const given = p.times[k] && !Number.isNaN(Date.parse(p.times[k]!)) ? new Date(p.times[k]!).toISOString() : null;
    times[k] = f.tracked[k] ?? given;
  }
  const fpm = p.fpm != null && Number.isInteger(p.fpm) && Math.abs(p.fpm) <= 5000 ? p.fpm : null;
  const draft: Draft = {
    ofp: f.ofp, times, fpm,
    manual: { fuel: money(p.manual.fuel), ground: money(p.manual.ground), catering: money(p.manual.catering) },
    fuelUsdPerKg: f.fuel?.usdPerKg ?? null, rating: null,          // rating arrives with WP7 (ADR-037: neutral until then)
    positioningNm: f.positioningNm, diversionNm: f.diverted ? f.diversionNm : null,
  };
  const errs = missing(draft);
  if (errs.length) return { ok: false, errors: [`חסרים: ${errs.join(', ')}`] };
  if (Date.parse(times.in!) > Date.now() + 5 * 60e3) return { ok: false, errors: ['IN לא יכול להיות בעתיד'] };

  const input = toEngineInput(draft)!;
  const result = compute(f.params, input);
  const ts = timesSource(f.tracked, times);
  const o = f.ofp;
  const lines = result.lines.map((l) => ({ code: l.code, amount_cents: l.amountCents, source: l.source, calc: l.calc }));

  const rows = await db()`
    WITH f AS (
      INSERT INTO flights (
        callsign, ofp_id, ofp_generated_at, status, source, origin_icao, dest_planned_icao, dest_actual_icao, alternate_icao,
        route_distance_nm, gc_distance_nm, aircraft_type, registration, seats, mtow_kg, mlw_kg, oew_kg,
        pax, cargo_kg, payload_kg, sched_out, sched_off, sched_on, sched_in, out_at, off_at, on_at, in_at, times_source,
        fpm, crew_location_icao, rate_set_id, eia_fuel_price_per_kg, local_out_hour, orig_utc_offset, rating_at_out,
        closed_at, ofp_doc)
      VALUES (
        ${o.callsign}, ${o.id}, ${o.generated_at}, 'closed', ${sourceOf(ts)}, ${o.origin.icao}, ${o.dest.icao},
        ${f.actual?.icao ?? o.dest.icao}, ${o.alternate},
        ${o.route_distance_nm}, ${o.gc_distance_nm}, ${o.aircraft.type}, ${o.aircraft.reg}, ${o.aircraft.seats},
        ${o.weights.mtow_kg}, ${o.weights.mlw_kg}, ${o.weights.oew_kg},
        ${o.weights.pax}, ${o.weights.freight_kg}, ${o.weights.payload_kg},
        ${o.sched.out}, ${o.sched.off}, ${o.sched.on}, ${o.sched.in},
        ${times.out}, ${times.off}, ${times.on}, ${times.in}, ${ts},
        ${fpm}, ${view.base.crew.icao}, ${f.rateSetId}, ${draft.fuelUsdPerKg}, ${input.out.hour}, ${o.orig_utc_offset}, ${null},
        now(), ${JSON.stringify(o)}::jsonb)
      ON CONFLICT (ofp_id) DO NOTHING
      RETURNING id)
    INSERT INTO ledger_lines (flight_id, code, amount_cents, source, calc)
    SELECT f.id, x.code, x.amount_cents, x.source, x.calc
    FROM f, jsonb_to_recordset(${JSON.stringify(lines)}::jsonb)
      AS x(code ledger_code, amount_cents bigint, source ledger_source, calc jsonb)
    RETURNING flight_id`;
  if (!rows.length) {
    // ON CONFLICT: this OFP is already in the logbook (e.g. a double click). Still reset the tracker.
    await ackTracker(view, f.ofp.id);
    return { ok: false, errors: ['הטיסה כבר רשומה בלוגבוק'] };
  }

  await ackTracker(view, f.ofp.id);
  revalidatePath('/');
  return { ok: true };
}

async function ackTracker(view: Awaited<ReturnType<typeof getFlightView>>, ofpId: string) {
  const t = view.base.tracker;
  if (!hasTracker() || !t || t.state === 'idle' || t.ofp?.id !== ofpId) return;
  // Stored in Neon already; if the Worker is unreachable the screen shows idle
  // (alreadyLogged) and the next close/ack attempt resets it.
  await trackerAck(ofpId).catch(() => {});
}

// Interrupted flight the user chose not to log (sketch s1a, state 6).
export async function discardFlight(ofpId: string): Promise<CloseResult> {
  await verifySession();
  const view = await getFlightView();
  if (view.base.tracker?.ofp?.id !== ofpId) return { ok: false, errors: ['אין טיסה כזו במעקב'] };
  await trackerAck(ofpId);
  revalidatePath('/');
  return { ok: true };
}
