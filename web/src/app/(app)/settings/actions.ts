'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { THEME_COOKIE } from '@/lib/constants';
import { getAirport } from '@/lib/airports';
import { checkSimbrief, checkVatsim, type Check } from '@/lib/external';
import { createRateVersion, getSettings, listRateVersions, updateAccounts } from '@/lib/settings';
import { FIELDS } from '@/lib/rates/catalogue';
import { validate, withChanges, type RateParams } from '@/lib/rates/params';
import { hasLegacy, runLegacyImport } from '@/lib/legacy';
import { syncMilestones } from '@/lib/analysis-data';

// Manual theme override (ADR-016). 'auto' removes it so the OS preference applies.
export async function setTheme(theme: 'auto' | 'light' | 'dark') {
  await verifySession();
  const store = await cookies();
  if (theme === 'auto') store.delete(THEME_COOKIE);
  else store.set(THEME_COOKIE, theme, { path: '/', maxAge: 365 * 24 * 3600, sameSite: 'lax', secure: true });
  revalidatePath('/', 'layout');
}

export type AccountsState = { error?: string; simbrief?: Check; vatsim?: Check; home?: Check } | undefined;

export async function saveAccounts(_prev: AccountsState, form: FormData): Promise<AccountsState> {
  await verifySession();
  const simbriefId = String(form.get('simbrief') ?? '').trim() || null;
  const cidRaw = String(form.get('cid') ?? '').trim();
  const home = String(form.get('home') ?? '').trim().toUpperCase();

  if (cidRaw && !/^\d{6,8}$/.test(cidRaw)) return { error: 'VATSIM CID הוא מספר בן 6–8 ספרות' };
  if (!/^[A-Z]{4}$/.test(home)) return { error: 'שדה הבית: קוד ICAO בן 4 אותיות' };
  const airport = await getAirport(home);
  if (!airport) return { error: `לא נמצא שדה ${home} במאגר` };

  const vatsimCid = cidRaw ? Number(cidRaw) : null;
  await updateAccounts({ simbriefId, vatsimCid, homeBaseIcao: home });
  const [simbrief, vatsim] = await Promise.all([
    simbriefId ? checkSimbrief(simbriefId) : Promise.resolve({ ok: false, text: 'לא הוגדר' }),
    vatsimCid ? checkVatsim(vatsimCid) : Promise.resolve({ ok: false, text: 'לא הוגדר' }),
  ]);
  revalidatePath('/settings');
  return { simbrief, vatsim, home: { ok: true, text: `${airport.name}` } };
}

export type RateSaveResult = { ok: true; id: number } | { ok: false; errors: string[] };

const PATHS = new Set(FIELDS.map((f) => f.path));

// Creates a new rate version from the current one plus the changed fields (ADR-021, 041).
export async function saveRateVersion(changes: Record<string, number>, note: string): Promise<RateSaveResult> {
  await verifySession();
  const unknown = Object.keys(changes).filter((p) => !PATHS.has(p));
  if (unknown.length) return { ok: false, errors: [`שדות לא מוכרים: ${unknown.join(', ')}`] };
  if (!Object.keys(changes).length) return { ok: false, errors: ['אין שינויים'] };

  const { currentRateSetId } = await getSettings();
  const current = (await listRateVersions()).find((v) => v.id === currentRateSetId);
  if (!current) return { ok: false, errors: ['הגרסה הפעילה לא נמצאה'] };

  let next: RateParams;
  try {
    next = withChanges(current.params, changes);
  } catch (e) {
    return { ok: false, errors: [(e as Error).message] };
  }
  const errors = validate(next);
  if (errors.length) return { ok: false, errors };

  const id = await createRateVersion(next, note.trim().slice(0, 200) || null);
  revalidatePath('/settings');
  return { ok: true, id };
}

export type LegacyResult =
  | { ok: true; imported: number; skipped: number; neonCents: number; mongoCents: number }
  | { ok: false; error: string };

// WP8: import the old app's flights (ADR-030), then back-fill milestones.
export async function importLegacyAction(): Promise<LegacyResult> {
  await verifySession();
  if (!hasLegacy()) return { ok: false, error: 'MONGODB_URI לא מוגדר' };
  try {
    const r = await runLegacyImport();
    await syncMilestones().catch(() => {});
    revalidatePath('/', 'layout');
    return { ok: true, imported: r.imported, skipped: r.skipped, neonCents: r.neonCents, mongoCents: r.mongoCents };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
