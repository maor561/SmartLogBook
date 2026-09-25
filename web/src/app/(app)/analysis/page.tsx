import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';
import { hasDb } from '@/lib/db';
import { loadLogbook } from '@/lib/logbook';
import { milestonesAchieved, pnlByCode, syncMilestones } from '@/lib/analysis-data';
import { rangeOf } from '@/lib/analysis';
import { AnalysisView } from './AnalysisView';

export const metadata: Metadata = { title: 'ניתוח · SmartLogBook' };

// Analysis (sketch s5, ADR-035): period in the URL, everything rendered on the server.
export default async function AnalysisPage({ searchParams }: PageProps<'/analysis'>) {
  await verifySession();
  if (!hasDb()) return <section className="panel"><div className="pb">מסד הנתונים לא מחובר.</div></section>;

  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const kind = (['m', 'q', 'y', 'all', 'custom'] as const).find((x) => x === str('p')) ?? 'm';
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(str('d')) ? str('d') : new Date().toISOString().slice(0, 10);
  const hist = str('hist') === '1';

  await syncMilestones().catch(() => {});
  const [{ flights }, pnl, achieved] = await Promise.all([
    loadLogbook(), pnlByCode(rangeOf(kind, anchor, str('from'), str('to')), hist), milestonesAchieved(),
  ]);
  return <AnalysisView kind={kind} anchor={anchor} hist={hist} from={str('from')} to={str('to')} flights={flights} pnl={pnl} achieved={achieved} />;
}
