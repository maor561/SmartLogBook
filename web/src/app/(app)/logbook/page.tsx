import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';
import { hasDb } from '@/lib/db';
import { loadLogbook } from '@/lib/logbook';
import { filtersFromQuery } from '@/lib/logbook-filter';
import { getSettings } from '@/lib/settings';
import { Logbook } from './Logbook';

export const metadata: Metadata = { title: 'לוגבוק · SmartLogBook' };

// Logbook (sketch s1b): list with filters, detail drawer, map, Excel.
export default async function LogbookPage({ searchParams }: PageProps<'/logbook'>) {
  await verifySession();
  if (!hasDb()) return <section className="panel"><div className="pb">מסד הנתונים לא מחובר.</div></section>;
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
  const [{ flights, airports }, settings] = await Promise.all([loadLogbook(), getSettings()]);
  return <Logbook flights={flights} airports={airports} home={settings.homeBaseIcao} initial={filtersFromQuery(qs)} />;
}
