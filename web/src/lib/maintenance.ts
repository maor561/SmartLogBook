// Fleet maintenance (sketch s12, ADR-060). Pure.
//  - Periodic checks are charged by the engine on the flight that crosses the interval.
//  - A hard landing no longer costs money at closing: it opens a repair request and
//    grounds the aircraft. Paying releases it; unpaid, it is released and charged
//    by itself after GROUND_DAYS.
import type { EngineResult, LedgerLine } from './engine';
import type { RateParams } from './rates/params';

export const GROUND_DAYS = 4;

export type RepairDraft = { cents: number; tier: string; fpm: number; calc: Record<string, unknown> };
export const TIER_LABEL: Record<string, string> = {
  visual: 'בדיקה ויזואלית', amm: 'בדיקת נחיתה קשה לפי ספר התחזוקה (AMM)', structural: 'בדיקה מבנית',
};

// With a registration to ground, the hard-landing line leaves the ledger and becomes a repair request.
// Without one (no registration in the OFP) there is nothing to ground, so it stays a direct cost.
export function settle(result: EngineResult, defer: boolean): { lines: LedgerLine[]; repair: RepairDraft | null; profitCents: number } {
  const hard = result.lines.find((l) => l.code === 'hard_landing');
  if (!hard || !defer) return { lines: result.lines, repair: null, profitCents: result.profitCents };
  const lines = result.lines.filter((l) => l !== hard);
  return {
    lines, profitCents: lines.reduce((s, l) => s + l.amountCents, 0),
    repair: { cents: -hard.amountCents, tier: String(hard.calc.tier), fpm: Number(hard.calc.fpm), calc: hard.calc },
  };
}

export type NextCheck = { kind: 'light' | 'medium'; everyHours: number; leftHours: number; doneShare: number; cents: number };

// How far each check is, and what it will cost for this aircraft. Empty for rate versions without checks.
export function nextChecks(p: RateParams, airHours: number, mtowT: number): NextCheck[] {
  const m = p.maintenance;
  const one = (kind: 'light' | 'medium', every: number | undefined, perT: number | undefined): NextCheck[] => {
    if (!every || every <= 0) return [];
    const since = airHours % every;
    return [{ kind, everyHours: every, leftHours: Math.round((every - since) * 10) / 10, doneShare: since / every, cents: Math.round((perT ?? 0) * mtowT * 100) }];
  };
  return [...one('light', m.lightEveryHours, m.lightPerMtowT), ...one('medium', m.mediumEveryHours, m.mediumPerMtowT)];
}

export const CHECK_LABEL = { light: 'טיפול קל', medium: 'טיפול בינוני' } as const;

// "3 ימים ו-21 שעות": how long until an unpaid repair is charged by itself.
export function untilDue(dueAt: string, now: number): string {
  const ms = Math.max(0, Date.parse(dueAt) - now), d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5);
  if (d === 0 && h === 0) return 'פחות משעה';
  const days = d === 1 ? 'יום' : `${d} ימים`, hours = h === 1 ? 'שעה' : `${h} שעות`;
  return d && h ? `${days} ו-${hours}` : d ? days : hours;
}
