import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';

export const metadata: Metadata = { title: 'ניתוח · SmartLogBook' };

export default async function AnalysisPage() {
  await verifySession();
  return (
    <section className="panel">
      <div className="empty">
        <div className="ring" aria-hidden>▤</div>
        <div>
          <h2>ניתוח</h2>
          <div className="muted">11 אזורים, דירוג, דרגה ואבני דרך. <span className="chip">בבנייה · WP7</span></div>
        </div>
      </div>
    </section>
  );
}
