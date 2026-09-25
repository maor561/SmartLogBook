// Logbook filters (ADR-023). Pure and shared: the list, the map and the Excel
// export all run exactly this function, so they always agree.
export type LedgerRow = { code: string; cents: number; source: string };

export type LogFlight = {
  id: number;
  date: string;                       // IN, or closed_at for flights without times
  callsign: string | null;
  origin: string;
  dest: string;                       // where it actually landed
  plannedDest: string;
  aircraft: string | null;
  reg: string | null;
  source: 'tracked' | 'partial' | 'manual' | 'historical';
  timesSource: string | null;         // 'vvmm'…
  times: { out: string | null; off: string | null; on: string | null; in: string | null };
  sched: { out: string | null; off: string | null; on: string | null; in: string | null };
  blockMin: number | null;
  airMin: number | null;
  fpm: number | null;
  pax: number | null;
  seats: number | null;
  cargoKg: number | null;
  distanceNm: number | null;
  profitCents: number;
  lines: LedgerRow[];
  rateSetId: number | null;
  closedAt: string | null;
  editedAt: string | null;
  crewFrom: string | null;
  editable: boolean;                  // ADR-021: closed flights with an OFP snapshot
};

export type Tag = 'div' | 'pos' | 'hard' | 'loss' | 'edited';
export const TAG_LABEL: Record<Tag, string> = { div: 'הסטה', pos: 'הקפצת צוות', hard: 'נחיתה קשה', loss: 'הפסד', edited: 'נערכה' };
export const SOURCE_LABEL = { tracked: 'נעקבה', partial: 'חלקית', manual: 'ידנית', historical: 'היסטורית' } as const;

export function tagsOf(f: LogFlight): Tag[] {
  const t: Tag[] = [];
  if (f.dest !== f.plannedDest) t.push('div');
  if (f.lines.some((l) => l.code === 'positioning')) t.push('pos');
  if (f.lines.some((l) => l.code === 'hard_landing') || (f.fpm != null && Math.abs(f.fpm) > 400)) t.push('hard');
  if (f.profitCents < 0) t.push('loss');
  if (f.editedAt) t.push('edited');
  return t;
}

export type Period = 'm' | 'q' | 'y' | 'all' | 'custom';
export type Filters = {
  q: string;
  period: Period;
  from: string;                       // YYYY-MM-DD, for 'custom'
  to: string;
  airport: string;
  aircraft: string;
  sources: string[];
  tags: Tag[];
};
export const NO_FILTERS: Filters = { q: '', period: 'all', from: '', to: '', airport: '', aircraft: '', sources: [], tags: [] };

// Start of the period, in UTC. `now` is passed in so the function stays pure.
export function periodStart(p: Period, now: Date): Date | null {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  if (p === 'm') return new Date(Date.UTC(y, m, 1));
  if (p === 'q') return new Date(Date.UTC(y, m - 2, 1));
  if (p === 'y') return new Date(Date.UTC(y, 0, 1));
  return null;
}

export function applyFilters(list: LogFlight[], f: Filters, now: Date): LogFlight[] {
  const q = f.q.trim().toUpperCase();
  const start = periodStart(f.period, now);
  const from = f.period === 'custom' && f.from ? Date.parse(`${f.from}T00:00:00Z`) : null;
  const to = f.period === 'custom' && f.to ? Date.parse(`${f.to}T23:59:59Z`) : null;
  return list.filter((x) => {
    const t = Date.parse(x.date);
    if (start && t < start.getTime()) return false;
    if (from != null && t < from) return false;
    if (to != null && t > to) return false;
    if (q && ![x.callsign, x.origin, x.dest, x.plannedDest, x.reg, x.aircraft].some((v) => v?.toUpperCase().includes(q))) return false;
    if (f.airport && x.origin !== f.airport && x.dest !== f.airport) return false;
    if (f.aircraft && x.aircraft !== f.aircraft) return false;
    if (f.sources.length && !f.sources.includes(x.source)) return false;
    if (f.tags.length) { const tg = tagsOf(x); if (!f.tags.every((k) => tg.includes(k))) return false; }
    return true;
  });
}

export function summarize(list: LogFlight[]) {
  const profit = list.reduce((s, x) => s + x.profitCents, 0);
  return {
    flights: list.length,
    blockMin: list.reduce((s, x) => s + (x.blockMin ?? 0), 0),
    profitCents: profit,
    avgCents: list.length ? Math.round(profit / list.length) : null,
    pax: list.reduce((s, x) => s + (x.pax ?? 0), 0),
  };
}

// Filters ⇄ URL query (the export link carries the exact same filters).
export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.period !== 'all') p.set('period', f.period);
  if (f.period === 'custom') { if (f.from) p.set('from', f.from); if (f.to) p.set('to', f.to); }
  if (f.airport) p.set('ap', f.airport);
  if (f.aircraft) p.set('ac', f.aircraft);
  if (f.sources.length) p.set('src', f.sources.join(','));
  if (f.tags.length) p.set('tags', f.tags.join(','));
  return p.toString();
}

export function filtersFromQuery(p: URLSearchParams): Filters {
  const period = (['m', 'q', 'y', 'all', 'custom'] as const).find((x) => x === p.get('period')) ?? 'all';
  const tags = (p.get('tags') ?? '').split(',').filter((t): t is Tag => t in TAG_LABEL);
  return {
    q: p.get('q') ?? '', period, from: p.get('from') ?? '', to: p.get('to') ?? '',
    airport: p.get('ap') ?? '', aircraft: p.get('ac') ?? '',
    sources: (p.get('src') ?? '').split(',').filter(Boolean), tags,
  };
}
