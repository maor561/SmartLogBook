import type { Metadata } from 'next';
import { verifySession } from '@/lib/dal';

export const metadata: Metadata = { title: 'טיסה · SmartLogBook' };

// Flight screen — state 1 "no active flight" from sketch 1a. The live states
// (plan ready, in flight, disconnected, completion) arrive in WP5.
export default async function FlightPage() {
  await verifySession();
  return (
    <section className="panel">
      <div className="empty">
        <div className="ring" aria-hidden>✈</div>
        <div>
          <h2>אין טיסה פעילה</h2>
          <div className="muted">המערכת תזהה לבד תוכנית חדשה ב-SimBrief וחיבור ל-VATSIM. <span className="chip">בבנייה · WP5</span></div>
        </div>
      </div>
    </section>
  );
}
