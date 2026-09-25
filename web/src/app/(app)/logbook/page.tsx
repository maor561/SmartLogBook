import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';

export const metadata: Metadata = { title: 'לוגבוק · SmartLogBook' };

export default async function LogbookPage() {
  await verifySession();
  return (
    <section className="panel">
      <div className="empty">
        <div className="ring" aria-hidden>≡</div>
        <div>
          <h2>הלוגבוק</h2>
          <div className="muted">רשימה, סינונים, פרטי טיסה ומפה. <span className="chip">בבנייה · WP6</span></div>
        </div>
      </div>
    </section>
  );
}
