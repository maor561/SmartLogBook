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
export const trackerAck = (ofpId: string) => call('/v1/ack', { method: 'POST', body: JSON.stringify({ ofp_id: ofpId }) });
