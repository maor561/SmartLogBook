'use client';

import { useActionState } from 'react';
import { saveAccounts } from './actions';
import type { Check } from '@/lib/external';

type Props = { simbriefId: string | null; vatsimCid: number | null; homeBaseIcao: string; homeBaseName: string | null };

function Status({ check, fallback }: { check?: Check; fallback?: string }) {
  if (check) return <span className={check.ok ? 'ok' : 'err'}>{check.ok ? '✓ ' : '✗ '}{check.text}</span>;
  return fallback ? <span className="small">{fallback}</span> : null;
}

export function AccountsForm(p: Props) {
  const [state, action, pending] = useActionState(saveAccounts, undefined);
  return (
    <form action={action} className="panel">
      <div className="panel-head">
        <span className="label">חשבונות</span>
        <span className="small">מזהים שבעזרתם המערכת מוצאת את התוכנית ואת הטיסה שלך</span>
      </div>
      <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
        <div className="acct">
          <label className="field">
            <span>SimBrief · שם משתמש או מזהה</span>
            <input name="simbrief" defaultValue={p.simbriefId ?? ''} autoComplete="off" />
            <Status check={state?.simbrief} />
          </label>
          <label className="field">
            <span>VATSIM CID</span>
            <input name="cid" defaultValue={p.vatsimCid ?? ''} inputMode="numeric" autoComplete="off" />
            <Status check={state?.vatsim} />
          </label>
          <label className="field">
            <span>שדה בית (ICAO)</span>
            <input name="home" defaultValue={p.homeBaseIcao} maxLength={4} autoComplete="off" style={{ textTransform: 'uppercase' }} />
            <Status check={state?.home} fallback={`${p.homeBaseName ?? ''} · מיקום הצוות אם אין טיסה קודמת`} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" className="btn btn-sm" disabled={pending}>{pending ? 'בודק…' : 'שמור ובדוק'}</button>
          {state?.error && <span className="err">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}
