import v1 from '../../../db/rate-set-v1.json' with { type: 'json' };

// Rate parameters (ADR-025–028, 034, 037). The shape is fixed by v1; every
// version stored in rate_sets.params has exactly these numeric leaves.
export type RateParams = typeof v1;
export const DEFAULTS: RateParams = v1;

// A leaf is addressed by a dotted path: 'fare.k', 'season.6', 'hour.night'.
export function getAt(p: RateParams, path: string): number {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], p) as number;
}

export function withChanges(p: RateParams, changes: Record<string, number>): RateParams {
  const next = structuredClone(p);
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split('.');
    const last = keys.pop()!;
    const parent = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, next as unknown as Record<string, unknown>);
    if (!(last in parent)) throw new Error(`unknown rate parameter: ${path}`);
    parent[last] = value;
  }
  return next;
}

export function leafPaths(p: unknown = DEFAULTS, prefix = ''): string[] {
  if (typeof p === 'number') return [prefix];
  return Object.entries(p as Record<string, unknown>).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
}

// Returns Hebrew error messages; empty = valid.
export function validate(p: RateParams): string[] {
  const errs: string[] = [];
  for (const path of leafPaths()) {
    const v = getAt(p, path);
    if (typeof v !== 'number' || !Number.isFinite(v)) errs.push(`${path}: חייב להיות מספר`);
    else if (v < 0 && !['fuel.minPct'].includes(path)) errs.push(`${path}: לא יכול להיות שלילי`);
  }
  if (errs.length) return errs;
  if (p.clamp.min >= p.clamp.max) errs.push('המעקה: המינימום חייב להיות קטן מהמקסימום');
  if (p.fuel.minPct > 0 || p.fuel.maxPct < 0) errs.push('תוספת דלק: התחתית ≤ 0 ≤ התקרה');
  const h = p.hardLanding;
  if (!(h.freeUpToFpm < h.visualUpToFpm && h.visualUpToFpm < h.ammUpToFpm)) errs.push('נחיתה קשה: הספים חייבים לעלות');
  if (p.crew.relief3AboveHours >= p.crew.relief4AboveHours) errs.push('צוות: סף טייס רביעי חייב להיות מעל סף טייס שלישי');
  if (p.crew.seatsPerAttendant < 1) errs.push('צוות: מושבים לדייל ≥ 1');
  if (p.fuel.refUsdPerKg <= 0 || p.nav.refMtowT <= 0) errs.push('מחירי ייחוס חייבים להיות חיוביים');
  return errs;
}
