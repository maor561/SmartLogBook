import 'server-only';
import { createHmac } from 'node:crypto';

// App side of the tracker link (ADR-024, 031). The Worker trusts a short-lived
// HMAC token signed with TRACKER_SECRET, shared by Vercel and Cloudflare.
// Token format (see tracker/src/auth.js): v1.<expEpochSec>.<base64url sig>
export const TRACKER_URL = process.env.TRACKER_URL || 'https://smartlogbook-tracker.smartlogbook-tracker.workers.dev';
const TTL_SEC = 10 * 60;

export function hasTracker() {
  return (process.env.TRACKER_SECRET?.length ?? 0) >= 32;
}

export function trackerToken(nowSec = Math.floor(Date.now() / 1000)) {
  const secret = process.env.TRACKER_SECRET;
  if (!secret || secret.length < 32) throw new Error('TRACKER_SECRET is not set (32+ chars)');
  const exp = nowSec + TTL_SEC;
  const sig = createHmac('sha256', secret).update(`v1.${exp}`).digest('base64url');
  return { token: `v1.${exp}.${sig}`, exp };
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${TRACKER_URL}${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: { ...init?.headers, authorization: `Bearer ${trackerToken().token}`, 'content-type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`tracker ${path}: ${res.status} ${body.error ?? ''}`.trim());
  return body;
}

export const trackerState = () => call('/v1/state');
// Which pilot to follow and whose SimBrief plans to read (from the settings screen).
export const trackerConfig = (vatsimCid: number | null, simbriefId: string | null) =>
  call('/v1/config', { method: 'POST', body: JSON.stringify({ vatsim_cid: vatsimCid, simbrief_id: simbriefId }) });

// Pushes the settings to the Worker when they differ from what it uses.
export async function syncTrackerConfig(state: { config?: { vatsim_cid: number | null; simbrief_id: string | null } },
  settings: { vatsimCid: number | null; simbriefId: string | null }) {
  const c = state.config;
  if (c && c.vatsim_cid === settings.vatsimCid && c.simbrief_id === settings.simbriefId) return false;
  await trackerConfig(settings.vatsimCid, settings.simbriefId);
  return true;
}

export const trackerAck = (ofpId: string) => call('/v1/ack', { method: 'POST', body: JSON.stringify({ ofp_id: ofpId }) });
