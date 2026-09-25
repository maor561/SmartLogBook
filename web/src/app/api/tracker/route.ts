import { NextResponse } from 'next/server';
import { getSession } from '@/lib/dal';
import { hasTracker, trackerState, trackerToken, TRACKER_URL } from '@/lib/tracker';

// GET /api/tracker → live tracker state (server-side), plus a short-lived token
// and URL so the live screen can poll the Worker directly (ADR-024: not via Vercel).
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasTracker()) return NextResponse.json({ error: 'TRACKER_SECRET not configured' }, { status: 503 });
  try {
    const state = await trackerState();
    return NextResponse.json({ ...state, direct: { url: TRACKER_URL, ...trackerToken() } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
