import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';
import { hasDb } from '@/lib/db';
import { getFlightView } from '@/lib/flight-view';
import { IdleView, PlanView } from './flight/IdlePlan';
import { LiveView } from './flight/LiveView';
import { CompletionForm } from './flight/CompletionForm';

export const metadata: Metadata = { title: 'טיסה · SmartLogBook' };

// Flight screen (sketch s1a): one page, six states, chosen on the server from
// the tracker, the latest SimBrief OFP and the logbook. `?manual=1` opens the
// manual form (plan ready → manual flight, or "finish manually" mid-flight).
export default async function FlightPage({ searchParams }: PageProps<'/'>) {
  await verifySession();
  if (!hasDb()) return <section className="panel"><div className="pb">מסד הנתונים לא מחובר.</div></section>;

  const manual = (await searchParams).manual === '1';
  const view = await getFlightView({ manual });

  switch (view.kind) {
    case 'idle': return <IdleView base={view.base} />;
    case 'plan': return <PlanView base={view.base} ofp={view.ofp} expiresInMin={view.expiresInMin} positioningNm={view.positioningNm} />;
    case 'live':
    case 'disc': return <LiveView initial={view.t} ofp={view.ofp} />;
    case 'done':
    case 'manual': return <CompletionForm key={view.form.ofp.id} form={view.form} crewIcao={view.base.crew.icao} />;
  }
}
