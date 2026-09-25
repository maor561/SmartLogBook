import Link from 'next/link';
import type { LogFlight } from '@/lib/logbook-filter';
import {
  aircraft, FPM_LABELS, groundByAirport, inRange, kpis, landings, network, ops, previousRange, rangeOf, routes, shift, trend, units,
  type Kpis, type PeriodKind,
} from '@/lib/analysis';
import { companyRating, MILESTONES, milestoneCrossings, nextMilestones, rankFor } from '@/lib/rating';
import { hm, nf, usd } from '@/lib/format';
import { PrintButton, HistToggle } from './Controls';

const PERIODS: [PeriodKind, string][] = [['m', 'חודש'], ['q', 'רבעון'], ['y', 'שנה'], ['all', 'הכל']];
const LINES: [string, string, 'rev' | 'exp', string?][] = [
  ['tickets', 'כרטיסים', 'rev'], ['cargo', 'מטען', 'rev'],
  ['fuel', 'דלק', 'exp', 'GSX'], ['ground_handling', 'צוות קרקע', 'exp', 'GSX'], ['catering', 'קייטרינג', 'exp', 'GSX'],
  ['crew', 'טייסים ודיילים', 'exp'], ['maintenance', 'תחזוקה', 'exp'], ['airport_fees', 'עמלות נחיתה ושדה', 'exp'],
  ['nav_charges', 'דמי ניווט', 'exp'], ['lease', 'חכירת מטוס', 'exp'], ['hard_landing', 'קנסות נחיתה', 'exp'],
  ['positioning', 'הקפצות צוות', 'exp'], ['diversion', 'הסטות', 'exp'],
];
const pct = (x: number | null, d = 0) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`);
const k$ = (c: number) => { const v = c / 100, a = Math.abs(v); return a >= 1000 ? `${v < 0 ? '−' : ''}$${(a / 1000).toFixed(a >= 100000 ? 0 : 1)}K` : usd(c); };

function Delta({ now, prev, kind, invert = false }: { now: number | null; prev: number | null; kind: 'n' | 'pp' | 'pct' | 'min'; invert?: boolean }) {
  if (now == null || prev == null) return <div className="d small">—</div>;
  const diff = now - prev;
  if (Math.abs(diff) < 1e-9) return <div className="d small">ללא שינוי</div>;
  const good = invert ? diff < 0 : diff > 0;
  const txt = kind === 'pp' ? `${diff > 0 ? '+' : '−'}${Math.abs(diff * 100).toFixed(0)} נק׳`
    : kind === 'pct' ? (prev ? `${diff > 0 ? '+' : '−'}${Math.abs((diff / Math.abs(prev)) * 100).toFixed(0)}%` : '—')
    : kind === 'min' ? `${diff > 0 ? '+' : '−'}${hm(Math.abs(diff))}`
    : `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(diff))}`;
  return <div className={`d ${good ? 'pos' : 'neg'}`}><bdi className="ltr">{txt}</bdi></div>;
}

function Stars({ s }: { s: number }) {
  return <span className="stars" aria-label={`${s} מתוך 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= Math.round(s) ? '' : 'off'}>★</span>)}</span>;
}

export type AnalysisData = {
  kind: PeriodKind; anchor: string; hist: boolean; from: string; to: string;
  flights: LogFlight[]; pnl: Record<string, number>; achieved: { cat: string; threshold: number; at: string; flightId: number | null }[];
};

// Pure render of the analysis screen (sketch s5). Data comes from page.tsx
// (Neon) or from /dev-preview fixtures.
export function AnalysisView({ kind, anchor, hist, from, to, flights, pnl, achieved }: AnalysisData) {
  const range = rangeOf(kind, anchor, from, to);
  const prev = previousRange(range);
  const pool = hist ? flights : flights.filter((f) => f.source !== 'historical');
  const list = pool.filter((f) => inRange(f, range));
  const prevList = prev ? pool.filter((f) => inRange(f, prev)) : null;

  const K = kpis(list), P: Kpis | null = prevList ? kpis(prevList) : null;
  const U = units(list), T = trend(list, range), G = groundByAirport(list), R = routes(list), O = ops(list);
  const L = landings(list, flights), A = aircraft(list), N = network(list, flights, range);
  const rating = companyRating(flights);
  const { totals, best } = milestoneCrossings(flights);
  const rank = rankFor(totals.block_hours);
  const next = nextMilestones(totals, best);
  const gotHere = achieved.filter((m) => (!range.from || Date.parse(m.at) >= range.from.getTime()) && (!range.to || Date.parse(m.at) < range.to.getTime()));

  const revTotal = LINES.filter((l) => l[2] === 'rev').reduce((s, [c]) => s + (pnl[c] ?? 0), 0);
  const netTotal = Object.values(pnl).reduce((s, v) => s + v, 0);
  const legacy = pnl.legacy_profit ?? 0;
  const q = (o: Record<string, string>) => {
    const u = new URLSearchParams({ p: kind, d: anchor, ...(hist ? { hist: '1' } : {}), ...o });
    return `/analysis?${u}`;
  };
  const prevAnchor = shift(range, -1), nextAnchor = shift(range, 1);
  const vs = prev ? `מול ${prev.label}` : '';

  // Trend chart geometry (RTL: oldest bucket on the right).
  const W = 720, H = 220, Lp = 44, Rp = 16, Tp = 18, Bp = 30;
  const maxV = Math.max(1, ...T.map((b) => Math.abs(b.netCents))) * 1.15, minV = Math.min(0, ...T.map((b) => b.netCents)) * 1.15;
  const bw = (W - Lp - Rp) / Math.max(1, T.length);
  const x = (i: number) => W - Rp - (i + 0.5) * bw, y = (v: number) => Tp + ((maxV - v) / (maxV - minV)) * (H - Tp - Bp);
  const histMax = Math.max(1, ...L.counts);

  return (
    <div className="an-shell">
      <div className="toolbar an-toolbar">
        <div className="seg" role="group" aria-label="תקופה">
          {PERIODS.map(([p, label]) => <Link key={p} href={q({ p })} aria-pressed={kind === p} className="seg-a">{label}</Link>)}
        </div>
        {(prevAnchor || nextAnchor) && (
          <div className="an-nav">
            {prevAnchor && <Link className="btn btn-sm" href={q({ d: prevAnchor })} aria-label="התקופה הקודמת">→</Link>}
            <b>{range.label}</b>
            {nextAnchor && <Link className="btn btn-sm" href={q({ d: nextAnchor })} aria-label="התקופה הבאה">←</Link>}
          </div>
        )}
        {kind === 'all' && <b>{range.label}</b>}
        <HistToggle checked={hist} on={q({ hist: '1' })} off={`/analysis?${new URLSearchParams({ p: kind, d: anchor })}`} />
        <div className="tb-end"><PrintButton /></div>
      </div>

      <div className="print-title">SmartLogBook · דוח {range.label}{hist ? ' · כולל טיסות היסטוריות' : ''}</div>

      {list.length === 0 ? (
        <section className="panel"><div className="pb muted">אין טיסות בתקופה הזו{hist ? '' : ' (טיסות היסטוריות מוסתרות)'}.</div></section>
      ) : null}

      <div className="an-grid">
        {/* 1 · KPIs */}
        <section className="panel w12">
          <div className="panel-head"><span className="label">1 · מדדי מפתח</span><span className="small">{vs}</span></div>
          <div className="kpis">
            <div className="kpi"><div className="label">טיסות</div><div className="v">{K.flights}</div><Delta now={K.flights} prev={P?.flights ?? null} kind="n" /></div>
            <div className="kpi"><div className="label">שעות בלוק</div><div className="v">{hm(K.blockMin)}</div><Delta now={K.blockMin} prev={P?.blockMin ?? null} kind="min" /></div>
            <div className="kpi"><div className="label">רווח נקי</div><div className={`v ${K.netCents < 0 ? 'neg' : ''}`}><bdi className="ltr">{k$(K.netCents)}</bdi></div><Delta now={K.netCents} prev={P?.netCents ?? null} kind="pct" /></div>
            <div className="kpi"><div className="label">שולי רווח</div><div className="v">{pct(K.margin)}</div><Delta now={K.margin} prev={P?.margin ?? null} kind="pp" /></div>
            <div className="kpi"><div className="label">נוסעים</div><div className="v">{nf(K.pax)}</div><Delta now={K.pax} prev={P?.pax ?? null} kind="pct" /></div>
            <div className="kpi"><div className="label">תפוסה</div><div className="v">{pct(K.lf)}</div><Delta now={K.lf} prev={P?.lf ?? null} kind="pp" /></div>
            <div className="kpi"><div className="label">בזמן (OTP)</div><div className="v">{pct(K.otp)}</div><Delta now={K.otp} prev={P?.otp ?? null} kind="pp" /></div>
            <div className="kpi"><div className="label">FPM ממוצע</div><div className="v">{K.avgFpm == null ? '—' : Math.round(K.avgFpm)}</div><Delta now={K.avgFpm} prev={P?.avgFpm ?? null} kind="n" invert /></div>
          </div>
        </section>

        {/* 2 · P&L — direct SUM over ledger_lines */}
        <section className="panel w8">
          <div className="panel-head"><span className="label">2 · רווח והפסד לפי סעיף</span><span className="small">סכום ישיר של ספר החשבונות</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>סעיף</th><th className="n">סכום</th><th className="n">מההכנסות</th><th /></tr></thead>
              <tbody>
                <tr className="grp"><td colSpan={4}>הכנסות</td></tr>
                {LINES.filter((l) => l[2] === 'rev').map(([c, n]) => <PnlRow key={c} name={n} cents={pnl[c] ?? 0} rev={revTotal} />)}
                <tr className="grp"><td colSpan={4}>הוצאות</td></tr>
                {LINES.filter((l) => l[2] === 'exp').map(([c, n, , tag]) => <PnlRow key={c} name={n} tag={tag} cents={pnl[c] ?? 0} rev={revTotal} />)}
                {legacy !== 0 && <><tr className="grp"><td colSpan={4}>טיסות היסטוריות</td></tr><PnlRow name="רווח (מערכת ישנה)" cents={legacy} rev={0} /></>}
                <tr className="tot"><td>רווח נקי</td><td className={`n ${netTotal < 0 ? 'neg' : 'pos'}`}>{usd(netTotal)}</td><td className="n">{revTotal ? pct((netTotal - legacy) / revTotal, 1) : '—'}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <div className="units">
            <div><div className="label">הכנסה למושב-מייל <span className="small">RASM</span></div><div className="v">{U.rasmCents == null ? '—' : `${U.rasmCents.toFixed(1)}¢`}</div></div>
            <div><div className="label">עלות למושב-מייל <span className="small">CASM</span></div><div className="v">{U.casmCents == null ? '—' : `${U.casmCents.toFixed(1)}¢`}</div></div>
            <div><div className="label">רווח לשעת בלוק</div><div className="v"><bdi className="ltr">{U.perBlockHourCents == null ? '—' : usd(Math.round(U.perBlockHourCents))}</bdi></div></div>
            <div><div className="label">רווח לטיסה</div><div className="v"><bdi className="ltr">{U.perFlightCents == null ? '—' : usd(Math.round(U.perFlightCents))}</bdi></div></div>
          </div>
        </section>

        {/* 10 · milestones */}
        <section className="panel w4">
          <div className="panel-head"><span className="label">10 · אבני דרך</span><span className="small">הבאה בכל קטגוריה</span></div>
          <div className="ms">
            {next.map((m) => (
              <div key={m.cat} className="ms-row">
                <span>{m.name}</span>
                <div className="ms-bar"><div style={{ width: `${m.next ? Math.min(100, (m.current / m.next) * 100) : 100}%` }} /></div>
                <span className="small ms-v"><bdi className="ltr">{m.next ? `${nf(Math.floor(m.current))} / ${nf(m.next)}${m.unit ? ` ${m.unit}` : ''}` : 'הכל הושג'}</bdi></span>
              </div>
            ))}
          </div>
          <div className="ms-got">
            <span className="small" style={{ width: '100%' }}>{gotHere.length ? 'הושגו בתקופה:' : 'לא הושגו אבני דרך בתקופה'}</span>
            {gotHere.map((m) => {
              const def = MILESTONES.find((x) => x.cat === m.cat);
              return <span key={`${m.cat}-${m.threshold}`} className="badge">{nf(m.threshold)}{def?.unit ? ` ${def.unit}` : ''} {def?.name} · {m.at.slice(8, 10)}.{m.at.slice(5, 7)}</span>;
            })}
          </div>
        </section>

        {/* 3 · trend */}
        <section className="panel w8">
          <div className="panel-head"><span className="label">3 · מגמה</span><span className="small">רווח {range.kind === 'm' ? 'שבועי' : 'חודשי'} ושולי רווח · הציר מתחיל מימין</span></div>
          <div className="chart">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="מגמת רווח">
              <line x1={Lp} x2={W - Rp} y1={y(0)} y2={y(0)} stroke="var(--line)" />
              {[maxV / 1.15, maxV / 2.3].map((v) => (
                <g key={v}><line x1={Lp} x2={W - Rp} y1={y(v)} y2={y(v)} stroke="var(--line-2)" /><text x={Lp - 4} y={y(v) + 4} textAnchor="end">{k$(v)}</text></g>
              ))}
              {T.map((b, i) => (
                <g key={b.label + i}>
                  <rect x={x(i) - bw * 0.3} y={Math.min(y(b.netCents), y(0))} width={bw * 0.6} height={Math.abs(y(0) - y(b.netCents))} fill={b.netCents < 0 ? 'var(--bad)' : 'var(--accent)'} opacity=".8" rx="2" />
                  <text x={x(i)} y={H - 10} textAnchor="middle">{b.label}</text>
                  {b.flights > 0 && b.revCents > 0 && <text x={x(i)} y={Math.min(y(b.netCents), y(0)) - 6} textAnchor="middle" className="ink">{Math.round((b.netCents / b.revCents) * 100)}%</text>}
                </g>
              ))}
            </svg>
          </div>
        </section>

        {/* 11 · rating & rank */}
        <section className="panel w4">
          <div className="panel-head"><span className="label">11 · דירוג החברה ודרגה</span><span className="small">{RATING_NOTE(rating)}</span></div>
          {rating ? (
            <div className="pillars">
              {rating.pillars.map((p) => (
                <div key={p.key} className="pillar" title={p.why}>
                  <div className="label">{p.name}</div>
                  <div><Stars s={p.score} /> <b>{p.score.toFixed(1)}</b></div>
                  <div className="small">{p.why}</div>
                </div>
              ))}
            </div>
          ) : <div className="pb small">הדירוג בבנייה: צריך לפחות 5 טיסות שנסגרו במערכת החדשה. עד אז מחיר הכרטיס לא מושפע ממוניטין.</div>}
          <div className="overall">
            {rating && <><div><div className="label">ציון כולל</div><div className="big">{rating.overall.toFixed(1)}</div></div><div><Stars s={rating.overall} /><div className="small">מוניטין במחיר: <bdi className="ltr">{`${rating.overall >= 3 ? '+' : '−'}${Math.abs(((rating.overall - 3) / 2) * 5).toFixed(1)}%`}</bdi></div></div></>}
            <div className="rank">
              <div className="label">דרגה</div>
              <div style={{ fontWeight: 700 }}>{rank.name}</div>
              <div className="small">{rank.next ? `${nf(rank.next.at)} שעות ל${rank.next.name} · עוד ${hm(rank.next.left * 60)}` : 'הדרגה הגבוהה ביותר'}</div>
            </div>
          </div>
        </section>

        {/* 4 · ground costs */}
        <section className="panel w12">
          <div className="panel-head"><span className="label">4 · עלויות קרקע לפי שדה</span><span className="small">מהסכומים שאתה מזין מ-GSX: איפה יקר לנחות?</span></div>
          {G.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>שדה</th><th className="n">טיפולים</th><th className="n">צוות קרקע, ממוצע</th><th className="n">מול הממוצע</th><th className="n">קייטרינג לנוסע</th><th className="n">דלק ל-NM</th></tr></thead>
                <tbody>
                  {G.map((g) => (
                    <tr key={g.icao}>
                      <td><bdi>{g.icao}</bdi></td><td className="n">{g.n}</td><td className="n">{usd(Math.round(g.groundAvgCents), false)}</td>
                      <td className={`n ${g.vsAvg > 0.1 ? 'neg' : g.vsAvg < -0.1 ? 'pos' : ''}`}>{`${g.vsAvg >= 0 ? '+' : '−'}${Math.abs(g.vsAvg * 100).toFixed(0)}%`}</td>
                      <td className="n">{g.cateringPerPaxCents == null ? '—' : `$${(g.cateringPerPaxCents / 100).toFixed(2)}`}</td>
                      <td className="n">{g.fuelPerNmCents == null ? '—' : `$${(g.fuelPerNmCents / 100).toFixed(2)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="pb small">אין עדיין סכומי GSX בתקופה.</div>}
        </section>

        {/* 5 · routes */}
        <section className="panel">
          <div className="panel-head"><span className="label">5 · מסלולים</span><span className="small">לפי רווח לשעת בלוק</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>מסלול</th><th className="n">טיסות</th><th className="n">תפוסה</th><th className="n">רווח/שעה</th><th className="n">שוליים</th></tr></thead>
              <tbody>
                {R.slice(0, 12).map((r) => (
                  <tr key={`${r.o}${r.d}`}>
                    <td><bdi>{r.o}</bdi> ← <bdi>{r.d}</bdi></td><td className="n">{r.n}</td><td className="n">{pct(r.lf)}</td>
                    <td className={`n ${r.netCents < 0 ? 'neg' : 'pos'}`}>{r.perHourCents == null ? '—' : usd(Math.round(r.perHourCents))}</td><td className="n">{pct(r.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6 · ops */}
        <section className="panel">
          <div className="panel-head"><span className="label">6 · דיוק ותפעול</span><span className="small">מהזמנים האמיתיים ב-VATSIM</span></div>
          <table className="tbl">
            <thead><tr><th>מדד</th><th className="n">ערך</th></tr></thead>
            <tbody>
              <tr><td>יציאה בזמן (עד 15 דק׳ מה-PUSHBACK המתוכנן)</td><td className="n pos">{pct(O.otp)}</td></tr>
              <tr><td>יציאות באיחור</td><td className="n">{O.late}</td></tr>
              <tr><td>יציאות מוקדמות</td><td className="n">{O.early}</td></tr>
              <tr><td>בלוק בפועל מול מתוכנן</td><td className="n">{O.blockVsPlanMin == null ? '—' : `${O.blockVsPlanMin >= 0 ? '+' : '−'}${Math.abs(Math.round(O.blockVsPlanMin))} דק׳`}</td></tr>
              {O.taxiOut.map((t) => <tr key={t.icao}><td>זמן הסעה להמראה · <bdi>{t.icao}</bdi></td><td className="n">{Math.round(t.min)} דק׳</td></tr>)}
            </tbody>
          </table>
        </section>

        {/* 7 · landings */}
        <section className="panel">
          <div className="panel-head"><span className="label">7 · איכות נחיתות</span><span className="small">התפלגות FPM</span></div>
          <div className="fpm-hist">{L.counts.map((c, i) => <div key={i} className={i >= 4 ? 'hard' : ''} style={{ height: `${(c / histMax) * 100}%` }}><span>{c}</span></div>)}</div>
          <div className="fpm-hist-l">{FPM_LABELS.map((l) => <span key={l}>{l}</span>)}</div>
          <div className="units">
            <div><div className="label">הנחיתה הטובה</div><div className="v"><bdi className="ltr">{L.best?.fpm ?? '—'}</bdi></div></div>
            <div><div className="label">נחיתות קשות</div><div className="v">{L.hard}</div></div>
            <div><div className="label">עלות הקנסות</div><div className="v"><bdi className="ltr">{usd(L.penaltyCents, false)}</bdi></div></div>
            <div><div className="label">רצף רכות (≤200)</div><div className="v">{L.softStreak}</div></div>
          </div>
        </section>

        {/* 8 · aircraft */}
        <section className="panel">
          <div className="panel-head"><span className="label">8 · מטוסים</span><span className="small">לפי רישום</span></div>
          <table className="tbl">
            <thead><tr><th>רישום</th><th className="n">טיסות</th><th className="n">שעות</th><th className="n">מחזורים</th><th className="n">רווח/שעה</th></tr></thead>
            <tbody>
              {A.map((a) => (
                <tr key={a.reg}><td><bdi>{a.reg}</bdi> <span className="small">{a.type}</span></td><td className="n">{a.n}</td><td className="n">{hm(a.min)}</td><td className="n">{a.n}</td>
                  <td className={`n ${a.net < 0 ? 'neg' : 'pos'}`}>{a.perHourCents == null ? '—' : usd(Math.round(a.perHourCents))}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 9 · network */}
        <section className="panel w12">
          <div className="panel-head"><span className="label">9 · רשת ואיכות נתונים</span><span className="small">הקפצות, הסטות, יעדים חדשים ומקור הטיסות</span></div>
          <div className="units u6">
            <div><div className="label">הקפצות צוות</div><div className="v">{N.positioning.n} · <bdi className="ltr">{usd(N.positioning.cents, false)}</bdi></div></div>
            <div><div className="label">הסטות</div><div className="v">{N.diversions.n} · <bdi className="ltr">{usd(N.diversions.cents, false)}</bdi></div></div>
            <div><div className="label">שדות שונים</div><div className="v">{N.airports}</div></div>
            <div><div className="label">שדות חדשים בתקופה</div><div className="v">{N.newAirports ?? '—'}</div></div>
            <div><div className="label">מקור: נעקבה</div><div className="v">{N.tracked}/{list.length}</div></div>
            <div><div className="label">חלקית או ידנית</div><div className="v">{N.partialOrManual}</div></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RATING_NOTE(r: ReturnType<typeof companyRating>) {
  return r ? `${r.flights} הטיסות האחרונות` : 'בבנייה';
}

function PnlRow({ name, cents, rev, tag }: { name: string; cents: number; rev: number; tag?: string }) {
  const p = rev ? Math.abs(cents) / rev : 0;
  return (
    <tr className={cents === 0 ? 'zero' : undefined}>
      <td>{name}{tag && <span className="small"> ({tag})</span>}</td>
      <td className={`n ${cents > 0 ? 'pos' : ''}`}>{usd(cents)}</td>
      <td className="n small">{rev ? `${(p * 100).toFixed(1)}%` : ''}</td>
      <td><span className="pctbar" style={{ width: `${Math.min(120, p * 240)}px` }} /></td>
    </tr>
  );
}
