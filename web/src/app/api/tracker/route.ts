import { NextResponse } from 'next/server';
import { getSession } from '@/lib/dal';
import { hasTracker, syncTrackerConfig, trackerState, trackerToken, TRACKER_URL } from '@/lib/tracker';
import { hasDb } from '@/lib/db';
import { getSettings } from '@/lib/settings';

// GET /api/tracker → live tracker state (server-side), plus a short-lived token
// and URL so the live screen can poll the Worker directly (ADR-024: not via Vercel).
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasTracker()) return NextResponse.json({ error: 'TRACKER_SECRET not configured' }, { status: 503 });
  try {
    let state = await trackerState();
    // Self-heal: if the Worker follows a different CID/SimBrief than the settings, push them.
    if (hasDb()) {
      const synced = await syncTrackerConfig(state, await getSettings()).catch(() => false);
      if (synced) state = await trackerState();
    }
    return NextResponse.json({ ...state, direct: { url: TRACKER_URL, ...trackerToken() } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
