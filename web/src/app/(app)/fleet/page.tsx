import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';
import { hasDb } from '@/lib/db';
import { loadFleet } from '@/lib/fleet';
import { FleetView } from './FleetView';

export const metadata: Metadata = { title: 'צי · SmartLogBook' };

const serverNow = () => Date.now();

// Fleet (sketch s12, ADR-060): hours, periodic checks and repair requests per registration.
export default async function FleetPage() {
  await verifySession();
  if (!hasDb()) return <section className="panel"><div className="pb">מסד הנתונים לא מחובר.</div></section>;
  const fleet = await loadFleet();
  return <FleetView fleet={fleet} now={serverNow()} />;
}
