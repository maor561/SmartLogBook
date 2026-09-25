// WP7 "done": every money figure on the analysis screen equals a direct SUM
// over ledger_lines (ADR-007). Runs the screen's own statement on Postgres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PNL_SQL, pnlParams } from '../src/lib/analysis-sql.ts';
import { rangeOf, kpis } from '../src/lib/analysis.ts';

const MIG = new URL('../db/migrations/', import.meta.url);
const EMPTY = { out: null, off: null, on: null, in: null };

test('P&L by line = SUM(ledger_lines); totals match per-flight profits', async () => {
  const db = new PGlite();
  for (const f of readdirSync(MIG).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(f, MIG), 'utf8'));
  await db.query('INSERT INTO rate_sets (params) VALUES ($1)', [readFileSync(new URL('../db/rate-set-v1.json', import.meta.url), 'utf8')]);

  const flights = [
    ['2026-09-03T10:00Z', 'closed', [['tickets', 2_000_000], ['cargo', 100_000], ['fuel', -900_000], ['crew', -120_000]]],
    ['2026-09-20T10:00Z', 'closed', [['tickets', 1_500_000], ['fuel', -700_000], ['hard_landing', -118_500]]],
    ['2026-08-30T10:00Z', 'closed', [['tickets', 999_999], ['fuel', -1]]],                     // previous month
    ['2026-09-10T10:00Z', 'historical', [['legacy_profit', 777_700]]],
  ];
  const mirror = [];
  for (const [at, status, lines] of flights) {
    const hist = status === 'historical';
    const { rows: [{ id }] } = await db.query(
      `INSERT INTO flights (status, source, origin_icao, dest_planned_icao, in_at, closed_at, rate_set_id)
       VALUES ($1, $2, 'LLBG', 'LGAV', $3, $3, $4) RETURNING id`,
      [status, hist ? 'historical' : 'tracked', at, hist ? null : 1]);
    for (const [code, cents] of lines) {
      await db.query(`INSERT INTO ledger_lines (flight_id, code, amount_cents, source) VALUES ($1, $2, $3, 'auto')`, [id, code, cents]);
    }
    mirror.push({
      id, date: new Date(at).toISOString(), source: hist ? 'historical' : 'tracked',
      lines: lines.map(([code, cents]) => ({ code, cents, source: 'auto' })), profitCents: lines.reduce((s, [, c]) => s + c, 0),
      times: EMPTY, sched: EMPTY, fpm: null, pax: null, seats: null, blockMin: null,
    });
  }

  const sept = rangeOf('m', '2026-09-15');
  const run = async (range, hist) => Object.fromEntries((await db.query(PNL_SQL, pnlParams(range, hist))).rows.map((r) => [r.code, Number(r.cents)]));
  const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const inSept = mirror.filter((f) => f.date.startsWith('2026-09'));

  const closed = await run(sept, false);
  assert.deepEqual(closed, { tickets: 3_500_000, cargo: 100_000, fuel: -1_600_000, crew: -120_000, hard_landing: -118_500 });
  assert.equal(total(closed), kpis(inSept.filter((f) => f.source !== 'historical')).netCents);

  const withHist = await run(sept, true);
  assert.equal(withHist.legacy_profit, 777_700);
  assert.equal(total(withHist), kpis(inSept).netCents);

  assert.equal(total(await run(rangeOf('all', '2026-01-01'), true)), mirror.reduce((s, f) => s + f.profitCents, 0));
});
