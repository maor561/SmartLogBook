import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/dal';
import { THEME_COOKIE } from '@/lib/constants';
import { logout } from '@/app/login/actions';
import { ThemePicker } from './ThemePicker';

export const metadata: Metadata = { title: 'הגדרות · SmartLogBook' };

export default async function SettingsPage() {
  await verifySession();
  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = raw === 'light' || raw === 'dark' ? raw : 'auto';

  return (
    <>
      <section className="panel">
        <div className="panel-head"><span className="label">תצוגה</span></div>
        <div className="panel-body"><ThemePicker current={theme} /></div>
      </section>

      <section className="panel">
        <div className="panel-head"><span className="label">חשבונות ותעריפים</span><span className="chip">בבנייה · WP2</span></div>
        <div className="panel-body muted">מזהה SimBrief, VATSIM CID, שדה הבית, ותעריפים עם גרסאות.</div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <form action={logout}><button type="submit" className="btn btn-ghost-bad">יציאה</button></form>
        </div>
      </section>
    </>
  );
}
