import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/dal';
import { THEME_COOKIE } from '@/lib/constants';
import { hasDb } from '@/lib/db';
import { getSettings, listRateVersions } from '@/lib/settings';
import { logout } from '@/app/login/actions';
import { ThemePicker } from './ThemePicker';
import { AccountsForm } from './AccountsForm';
import { RatesEditor } from './RatesEditor';
import { LegacyImport } from './LegacyImport';
import { hasLegacy, planLegacyImport } from '@/lib/legacy';

export const metadata: Metadata = { title: 'הגדרות · SmartLogBook' };

export default async function SettingsPage() {
  await verifySession();
  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = raw === 'light' || raw === 'dark' ? raw : 'auto';
  const data = hasDb() ? await Promise.all([getSettings(), listRateVersions()]) : null;
  // Shown only while MONGODB_URI is set (WP8); remove the variable after the cutover.
  const legacy = data && hasLegacy()
    ? await planLegacyImport().then(
        (p) => ({ total: p.total, missing: p.missing.length, present: p.present, errors: p.errors, mongoCents: p.mongoProfitCents, from: p.from, to: p.to }),
        (e: Error) => ({ error: e.message }))
    : null;

  return (
    <>
      {data ? (
        <>
          <AccountsForm {...data[0]} />
          <RatesEditor versions={data[1]} currentId={data[0].currentRateSetId} />
          {legacy && <LegacyImport plan={legacy} />}
        </>
      ) : (
        <section className="panel">
          <div className="panel-head"><span className="label">חשבונות ותעריפים</span><span className="chip warn">אין מסד נתונים</span></div>
          <div className="panel-body muted">מסד הנתונים עוד לא מחובר (DATABASE_URL). אחרי החיבור ב-Vercel ופריסה מחדש, החשבונות והתעריפים יופיעו כאן.</div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head"><span className="label">תצוגה</span></div>
        <div className="panel-body"><ThemePicker current={theme} /></div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <form action={logout}><button type="submit" className="btn btn-ghost-bad">יציאה</button></form>
        </div>
      </section>
    </>
  );
}
