'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { expWait, MIN, SI, simulate, stateAt, STATIONS, summary, type QueueId, type Sim, type SimInput, type StationState } from '@/lib/terminal/sim';
import { CHIP_AT, layout, MAP_H, MAP_W, place, type DotClass, type Layout } from '@/lib/terminal/map';

// Terminal tab (sketch s7, ADR-053): the departure terminal from the curb to the
// seat, derived from the OFP. Display only, and always live: the clock is the real
// one (ADR-055). The dots are drawn straight into the SVG every frame; the panels
// re-render a few times a second.

const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);
const mmss = (ms: number) => { const m = Math.round(Math.abs(ms) / MIN); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const R_DOT = 5.5, R_SEAT = 2.6;
const HOT = 10;                                    // minutes of queue that count as congestion

type Rings = Partial<Record<QueueId, (SVGCircleElement | null)[]>>;

// One frame of the map: every dot glides toward where the simulation says it is.
function drawDots(sim: Sim, L: Layout, time: number, dots: (SVGCircleElement | null)[], rings: Rings, xy: Float32Array, snap: boolean) {
  const { S, pos } = stateAt(sim, time);
  const qIdx = new Map<number, number>();
  S.forEach((x) => x.queue.forEach((q, k) => qIdx.set(q.p.i, k)));
  const busy: Partial<Record<QueueId, Set<number>>> = {};
  for (const p of sim.pax) {
    const el = dots[p.i]; if (!el) continue;
    const w = pos[p.i];
    if (!w) { el.setAttribute('visibility', 'hidden'); xy[p.i * 2] = NaN; continue; }
    const { xy: [x, y], cls } = place(L, p, w, qIdx.get(p.i) ?? 0);
    if (w.kind === 'serve') (busy[STATIONS[w.st].id as QueueId] ??= new Set()).add(w.server);
    let cx = xy[p.i * 2], cy = xy[p.i * 2 + 1];
    // glide, so a queue moving up looks like steps; jump on a new appearance or after a long pause
    if (snap || Number.isNaN(cx) || Math.hypot(x - cx, y - cy) > 160) { cx = x; cy = y; }
    else { cx += (x - cx) * 0.3; cy += (y - cy) * 0.3; }
    xy[p.i * 2] = cx; xy[p.i * 2 + 1] = cy;
    el.setAttribute('visibility', 'visible');
    el.setAttribute('cx', cx.toFixed(1)); el.setAttribute('cy', cy.toFixed(1));
    el.setAttribute('class', `tm-p tm-${cls}`);
    el.setAttribute('r', String(cls === 'seat' ? R_SEAT : R_DOT));
  }
  for (const [id, list] of Object.entries(rings) as [QueueId, (SVGCircleElement | null)[]][]) {
    list.forEach((el, k) => el?.setAttribute('class', `tm-srv${busy[id]?.has(k) ? ' busy' : ''}`));
  }
}

export function Terminal({ input, utcOffset, title }: { input: SimInput; utcOffset: number | null; title: string }) {
  const sim = useMemo(() => simulate(input), [input]);
  const L = useMemo(() => layout(sim), [sim]);

  // Published by the timer: simulated time (the real clock, held inside the simulated window) and the real time.
  const [clock, setClock] = useState<{ t: number; wall: number } | null>(null);

  // Full screen (sketch 8, WP10): the same map over the whole display, for a tablet next to the cockpit.
  const [full, setFull] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const snap = useRef(true);
  const dots = useRef<(SVGCircleElement | null)[]>([]), rings = useRef<Rings>({});
  const xy = useRef<Float32Array>(new Float32Array(0));

  useEffect(() => {
    const simNow = () => Math.min(sim.end, Math.max(sim.start, Date.now()));
    if (xy.current.length !== sim.pax.length * 2) { xy.current = new Float32Array(sim.pax.length * 2).fill(NaN); snap.current = true; }
    let raf = 0;
    const frame = () => {
      drawDots(sim, L, simNow(), dots.current, rings.current, xy.current, snap.current); snap.current = false;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Panels on their own timer: animation frames stop in a background tab, the clock shouldn't.
    const publish = () => setClock({ t: simNow(), wall: Date.now() });
    const first = setTimeout(publish, 0), id = setInterval(publish, 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(first); clearInterval(id); };
  }, [sim, L]);

  useEffect(() => {
    if (!full) return;
    const el = root.current;
    // Real full screen where the browser has it (not on iPhone: the overlay still covers the page).
    el?.requestFullscreen?.().catch(() => {});
    const onFs = () => { if (!document.fullscreenElement) setFull(false); };       // Esc, or the browser's own exit
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Keep the display awake; the lock is dropped whenever the tab is hidden, so take it again on return.
    let lock: WakeLockSentinel | null = null, gone = false;
    const wake = () => navigator.wakeLock?.request('screen').then((l) => { if (gone) l.release(); else lock = l; }).catch(() => {});
    const onVisible = () => { if (!document.hidden) wake(); };
    wake();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      gone = true; lock?.release().catch(() => {});
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisible);
      document.body.style.overflow = overflow;
      if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
    };
  }, [full]);

  if (!clock) return <div className="pb small">מכין את הטרמינל…</div>;
  const { t, wall } = clock;

  const { S } = stateAt(sim, t);
  const N = sim.pax.length, T0 = sim.t0;
  const arrived = sim.pax.filter((p) => p.arr <= t).length;
  const seated = sim.pax.filter((p) => p.seated != null && p.seated <= t).length;
  const lateNow = sim.pax.filter((p) => p.late && p.steps.find((s) => s.st === SI.gate)!.ready <= t).length;
  const boarding = t >= sim.boardOpen;

  const overdue = wall > T0 ? wall - T0 : 0;
  const shown = wall;                                       // the real time, also before and after the simulated window
  const local = utcOffset != null ? hhmm(shown + utcOffset * 3600e3) : null;
  const hot = (st: number) => { const w = expWait(sim, st, S[st]); return w != null && w >= HOT; };
  const list = alerts({ sim, S, t, arrived, lateNow, seated, overdue });
  const next = nextEvent(sim, t);
  const frac = (at: number) => Math.min(1, Math.max(0, (at - sim.start) / (sim.end - sim.start)));
  const one = list[Math.floor(wall / 5000) % list.length];      // full screen: one line, rotating every 5 seconds

  return (
    <div className={`tm${full ? ' tm-full' : ''}`} ref={root}>
      {!full && (
        <div className="tm-ctrl">
          <div className="tm-clock"><b><bdi>{hhmm(shown)}</bdi></b><span className="small">Z{local && ` · ${local} מקומי`}</span></div>
          <span className="tm-tminus">{shown < T0 ? `T−${mmss(T0 - shown)} ל-PUSHBACK` : 'PUSHBACK'}</span>
          <span className="tm-live"><i />חי</span>
          <button type="button" className="btn btn-sm tm-fullbtn" onClick={() => setFull(true)}>מסך מלא</button>
        </div>
      )}

      {full && (
        <header className="tm-ftop">
          <div className="tm-count">
            <span className={`t${overdue ? ' over' : ''}`}><bdi>{overdue ? `+${mmss(overdue)}` : mmss(T0 - shown)}</bdi></span>
            <span className="lbl">
              <b>{overdue ? 'אחרי PUSHBACK' : 'ל-PUSHBACK'}</b>
              <small><bdi>{title}</bdi> · <bdi>{hhmm(shown)}Z</bdi>{local && <> · <bdi>{local}</bdi></>}</small>
            </span>
          </div>
          <div className="tm-nums">
            <div><div className="l">בדרך לשער</div><div className="v">{arrived - seated - lateNow - S[SI.gate].dwell}</div></div>
            <div><div className="l">ממתינים בשער</div><div className="v">{S[SI.gate].dwell}</div></div>
            <div>
              <div className="l">יושבים במטוס</div><div className="v">{seated}<small> / {N}</small></div>
              <div className="tm-bar"><div style={{ width: `${(seated / Math.max(1, N)) * 100}%` }} /></div>
            </div>
            <div className="tm-next">
              <div className="l">הבא</div>
              <div className="v">{next ? <>{next[1]} <span>בעוד {mmss(next[0] - t)}</span></> : 'מוכן לדחיפה'}</div>
            </div>
          </div>
          <div className="tm-tools">
            <span className="tm-live"><i />חי</span>
            <button type="button" className="tm-ib" onClick={() => setFull(false)} aria-label="סגור מסך מלא" title="סגור">✕</button>
          </div>
        </header>
      )}

      <div className="metrics tm-kpis">
        <Kpi label="הגיעו לשדה" v={arrived} of={N} />
        <Kpi label="בטרמינל עכשיו" v={arrived - seated - lateNow} />
        <Kpi label="עברו בידוק" v={S[SI.security].done} of={N} />
        <Kpi label="ממתינים בשער" v={S[SI.gate].dwell} />
        <Kpi label="יושבים במטוס" v={seated} of={N} />
        <Kpi label={boarding ? (t < sim.gateClose ? 'השער נסגר בעוד' : 'השער נסגר') : 'העלייה מתחילה בעוד'}
          text={boarding ? (t < sim.gateClose ? mmss(sim.gateClose - t) : `${hhmm(sim.gateClose)}Z`) : mmss(sim.boardOpen - t)} />
      </div>

      <div className="tm-body">
        <div className="tm-stage">
          <div className="tm-mapscroll">
            <div className="tm-map">
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="מבט-על של הטרמינל">
                <image href="/terminal-topdown.jpg" x={0} y={0} width={MAP_W} height={MAP_H} />
                <g>
                  {L.closed.map(([x, y], k) => <path key={k} className="tm-closed" d={`M${x - 6},${y - 6}L${x + 6},${y + 6}M${x + 6},${y - 6}L${x - 6},${y + 6}`} />)}
                  {(Object.keys(L.rings) as QueueId[]).map((id) => L.rings[id].map(([x, y], k) => (
                    <circle key={`${id}${k}`} cx={x} cy={y} r={14} className="tm-srv" ref={(el) => { (rings.current[id] ??= [])[k] = el; }} />
                  )))}
                </g>
                <g>{sim.pax.map((p) => <circle key={p.i} r={R_DOT} className="tm-p" visibility="hidden" ref={(el) => { dots.current[p.i] = el; }} />)}</g>
              </svg>
              {STATIONS.map((s, st) => {
                const x = S[st], w = expWait(sim, st, x);
                const n = s.id === 'aircraft' ? seated : x.queue.length + x.serve + x.dwell;     // seated: the same number as the counters
                const sub = s.kind === 'queue' ? `תור ${x.queue.length} · ${w ? `~${w} דק׳` : 'בלי המתנה'}` : s.id === 'aircraft' ? `יושבים, מתוך ${N}` : `עברו ${x.done}`;
                return (
                  <div key={s.id} className={`tm-chip${hot(st) ? ' hot' : ''}`}
                    style={{ '--c': s.c, left: `${(CHIP_AT[s.id][0] / MAP_W) * 100}%`, top: `${(CHIP_AT[s.id][1] / MAP_H) * 100}%` } as React.CSSProperties}>
                    <b>{s.he}</b><span className="n">{n}</span><span className="s">{sub}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="tm-legend">
            {([['walk', 'בדרך'], ['queue', 'בתור'], ['serve', 'בשירות / עולה'], ['shop', 'בדיוטי-פרי'], ['gate', 'ממתין בשער'], ['seat', 'יושב במטוס'], ['late', 'איחר']] as [DotClass, string][])
              .map(([c, l]) => <span key={c}><i className={`tm-${c}`} />{l}</span>)}
            <span><i className="tm-open" />עמדה פתוחה לטיסה</span>
            <span><b className="tm-x">✕</b>עמדה סגורה</span>
          </div>
        </div>

        <aside className="tm-side">
          <div className="panel-head"><span className="label">תחנות עכשיו</span></div>
          <table className="tbl tm-tbl">
            <thead><tr><th>תחנה</th><th className="n">תור · שירות</th><th className="n">המתנה</th></tr></thead>
            <tbody>
              {STATIONS.slice(0, 8).map((s, st) => {
                const x = S[st], w = expWait(sim, st, x);
                return (
                  <tr key={s.id} className={hot(st) ? 'hot' : undefined}>
                    <td><i style={{ background: s.c }} />{s.he}</td>
                    <td className="n">{s.kind === 'queue' ? `${x.queue.length} · ${x.serve}` : x.dwell}</td>
                    <td className="n">{w == null ? '—' : w ? `~${w} דק׳` : 'אין תור'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="panel-head"><span className="label">התראות</span></div>
          <div className="tm-alerts">
            {list.map(([c, text], k) => <div key={k} className={`tm-alert ${c}`}>{text}</div>)}
          </div>

          {t >= sim.doorClose && <Summary sim={sim} />}

          <div className="panel-head"><span className="label">לוח זמנים לעלייה</span></div>
          <Timeline sim={sim} t={t} />
        </aside>
      </div>

      {full && (
        <>
          {/* where we are on the way to PUSHBACK: an indicator, not a control (ADR-055) */}
          <div className="tm-track" aria-hidden>
            <div className="rail" /><div className="fill" style={{ width: `${frac(t) * 100}%` }} />
            {([[sim.t0 - 180 * MIN, "צ'ק-אין נפתח"], [sim.boardOpen, 'עלייה'], [sim.gateClose, null], [sim.doorClose, null], [sim.t0, 'PUSHBACK']] as [number, string | null][]).map(([at, label], k, all) => (
              <span key={k}>
                <i className={`mk${at <= t ? ' past' : ''}`} style={{ left: `${frac(at) * 100}%` }} />
                {label && <span className={`ml${k === all.length - 1 ? ' end' : ''}${k === 1 ? ' mid' : ''}${at <= t ? ' past' : ''}`}
                  style={{ left: `${k === all.length - 1 ? 100 : Math.max(5, frac(at) * 100)}%` }}>{label} · {hhmm(at)}</span>}
              </span>
            ))}
            <div className="knob" style={{ left: `${frac(t) * 100}%` }} />
          </div>
          <div className={`tm-line ${one[0]}`} role="status" aria-live="polite">
            <span className="ic">{ICON[one[0]] ?? '·'}</span><span className="txt">{one[1]}</span>
            {list.length > 1 && <span className="more">{(Math.floor(wall / 5000) % list.length) + 1} / {list.length}</span>}
          </div>
        </>
      )}
    </div>
  );
}

const ICON: Record<string, string> = { warn: '▲', bad: '●', go: '✓' };

// What comes next, in the order a departure unfolds.
function nextEvent(sim: Sim, t: number): [number, string] | null {
  const all: [number, string][] = [
    [sim.t0 - 180 * MIN, "הצ'ק-אין נפתח"], [sim.boardOpen, 'העלייה מתחילה'],
    [sim.zoneCall[2], 'אזור 2 נקרא לעלות'], [sim.zoneCall[3], 'אזור 3 נקרא לעלות'], [sim.zoneCall[4], 'אזור 4 נקרא לעלות'],
    [sim.gateClose, 'השער נסגר'], [sim.doorClose, 'הדלת נסגרת'], [sim.t0, 'PUSHBACK'],
  ];
  return all.find(([at]) => at > t) ?? null;
}

function Kpi({ label, v, of, text }: { label: string; v?: number; of?: number; text?: string }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="v">{text ?? v}{of != null && <small> / {of}</small>}</div>
      {of != null && <div className="tm-bar"><div style={{ width: `${((v ?? 0) / Math.max(1, of)) * 100}%` }} /></div>}
    </div>
  );
}

// Most urgent first: the full-screen line shows one at a time.
function alerts({ sim, S, t, arrived, lateNow, seated, overdue }: {
  sim: Sim; S: StationState[]; t: number; arrived: number; lateNow: number; seated: number; overdue: number;
}): [string, React.ReactNode][] {
  const A: [string, React.ReactNode][] = [];
  if (overdue >= MIN) A.push(['warn', <>הנוסעים יושבים וממתינים <b>{Math.round(overdue / MIN)} דק׳</b> מעבר ל-PUSHBACK המתוכנן</>]);
  if (lateNow) A.push(['bad', <><b>{lateNow}</b> {lateNow === 1 ? 'נוסע הגיע' : 'נוסעים הגיעו'} לשער אחרי שנסגר</>]);
  const missing = sim.pax.length - arrived;
  if (t >= sim.boardOpen && missing > 0) A.push(['bad', <><b>{missing}</b> נוסעים עוד לא הגיעו לשדה, והעלייה כבר התחילה</>]);
  STATIONS.forEach((s, st) => {
    const w = expWait(sim, st, S[st]);
    if (w != null && w >= HOT) A.push(['warn', <><b>{s.he}:</b> {S[st].queue.length} בתור, המתנה של כ-{w} דקות</>]);
  });
  if (t >= sim.doorClose) A.push(['go', <>הדלת נסגרה ב-<bdi>{hhmm(sim.doorClose)}Z</bdi>, {seated} נוסעים על המטוס</>]);
  else if (t >= sim.boardOpen) A.push(['', <>העלייה למטוס בעיצומה: {seated} מתוך {sim.pax.length} כבר יושבים</>]);
  if (t <= sim.start) A.push(['', <>הנוסעים יתחילו להגיע ב-<bdi>{hhmm(Math.min(...sim.pax.map((p) => p.arr)))}Z</bdi>.</>]);
  if (!A.length) A.push(['', 'הכל זורם. אין תורים חריגים.']);
  return A;
}

function Summary({ sim }: { sim: Sim }) {
  const s = summary(sim);
  return (
    <>
      <div className="panel-head"><span className="label">סיכום</span></div>
      <div className="tm-sum">
        <div><span>עלו למטוס</span><b>{s.boarded} / {sim.pax.length}</b></div>
        {s.late > 0 && <div><span>איחרו לשער</span><b>{s.late}</b></div>}
        <div><span>הדלת נסגרה</span><b><bdi>{hhmm(s.doorClose)}Z</bdi></b></div>
        {s.bottleneck && <div><span>צוואר הבקבוק</span><b>{STATIONS[s.bottleneck.st].he} · {s.bottleneck.avgMin.toFixed(1)} דק׳ בממוצע</b></div>}
        {s.avgTripMin != null && <div><span>מהכניסה לכיסא</span><b>{mmss(s.avgTripMin * MIN)} בממוצע</b></div>}
      </div>
    </>
  );
}

function Timeline({ sim, t }: { sim: Sim; t: number }) {
  const r = sim.rows, z1 = Math.max(2, Math.round(r * 0.125)), z2 = Math.round(r * 0.68), z3 = Math.round(r * 0.37);
  const TL: [number, string][] = [
    [sim.t0 - 180 * MIN, 'הדלפקים נפתחים'], [sim.boardOpen, `עלייה · אזור 1 (עדיפות, שורות 1–${z1})`],
    [sim.zoneCall[2], `אזור 2 · שורות ${z2}–${r}`], [sim.zoneCall[3], `אזור 3 · שורות ${z3}–${z2 - 1}`],
    [sim.zoneCall[4], `אזור 4 · שורות ${z1 + 1}–${z3 - 1}`], [sim.gateClose, 'השער נסגר'], [sim.doorClose, 'הדלת נסגרת'], [sim.t0, 'PUSHBACK'],
  ];
  let cur = -1; TL.forEach(([at], k) => { if (at <= t) cur = k; });
  return (
    <div className="tm-tl">
      {TL.map(([at, x], k) => (
        <div key={k} className={k < cur ? 'done' : k === cur ? 'now' : undefined}><span className="t"><bdi>{hhmm(at)}</bdi></span><span>{x}</span></div>
      ))}
    </div>
  );
}
