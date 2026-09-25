import { getSession } from '@/lib/dal';

// Minimal protected endpoint — WP1 "done" criterion: every API rejects a
// request without a valid session (ADR-031).
export async function GET() {
  if (!(await getSession())) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return Response.json({ ok: true, app: 'smartlogbook-web', phase: 'WP1' });
}
