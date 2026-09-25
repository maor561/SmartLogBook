import 'server-only';

// Account checks for the settings screen (sketch s6): prove the IDs are real
// before the tracker relies on them.
const TIMEOUT_MS = 8000;

export type Check = { ok: boolean; text: string };

export async function checkSimbrief(id: string): Promise<Check> {
  const key = /^\d+$/.test(id) ? 'userid' : 'username';
  try {
    const res = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${key}=${encodeURIComponent(id)}&json=1`, {
      signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store',
    });
    if (res.status === 400) return { ok: false, text: 'SimBrief לא מצא משתמש כזה, או שאין לו OFP' };
    if (!res.ok) return { ok: false, text: `SimBrief לא זמין (${res.status})` };
    const j = await res.json();
    return { ok: true, text: `נמצא OFP אחרון: ${j.origin?.icao_code} → ${j.destination?.icao_code}` };
  } catch {
    return { ok: false, text: 'SimBrief לא הגיב' };
  }
}

export async function checkVatsim(cid: number): Promise<Check> {
  try {
    const res = await fetch(`https://api.vatsim.net/v2/members/${cid}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    if (res.status === 404) return { ok: false, text: 'אין חבר VATSIM עם המזהה הזה' };
    if (!res.ok) return { ok: false, text: `VATSIM לא זמין (${res.status})` };
    return { ok: true, text: 'מזהה תקין' };
  } catch {
    return { ok: false, text: 'VATSIM לא הגיב' };
  }
}
