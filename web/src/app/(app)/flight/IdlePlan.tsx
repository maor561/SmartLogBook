import Link from 'next/link';
import type { Base } from '@/lib/flight-view';
import type { OfpSummary } from '@/lib/ofp';
import { ddmm, hm, minsBetween, nf, z } from '@/lib/format';
import { Head, LogbookLink, MonthAside, RecentTable } from './Parts';

// State 1 · no active flight (sketch s1a).
export function IdleView({ base }: { base: Base }) {
  const s = base.settings;
  return (
    <div className="main">
      <div className="stack">
        <section className="panel">
          <div className="idle">
            <div className="ring" aria-hidden>✈</div>
            <div>
              <h2>אין טיסה פעילה</h2>
              <div className="muted">המערכת בודקת את SimBrief ומחכה לתוכנית חדשה. כשתיצור תוכנית, היא תופיע כאן לבד.</div>
            </div>
          </div>
          <div className="facts">
            <div>
              <div className="label">מיקום הצוות</div>
              <div className="v"><bdi>{base.crew.icao}</bdi>{base.crew.name && ` · ${base.crew.name}`}</div>
              <div className="small">{base.crew.since ? `נחתו ${ddmm(base.crew.since)} · ${z(base.crew.since)}Z` : 'שדה הבית'}</div>
            </div>
            <div><div className="label">SimBrief</div><div className="v"><bdi>{s.simbriefId ?? '—'}</bdi></div><div className="small">אין תוכנית מהשעות האחרונות</div></div>
            <div><div className="label">VATSIM</div><div className="v"><bdi>CID {s.vatsimCid ?? '—'}</bdi></div><div className="small">{base.trackerError ? `מעקב: ${base.trackerError}` : 'מנוע המעקב פעיל'}</div></div>
          </div>
          <div className="banner info">
            <span className="grow small">תוכנית שממריאה משדה שאינו <b style={{ color: 'var(--ink)' }}><bdi>{base.crew.icao}</bdi></b> תחויב ב<b style={{ color: 'var(--ink)' }}>הקפצת צוות</b>.</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><span className="label">טיסות אחרונות</span><LogbookLink /></div>
          <RecentTable rows={base.recent} />
        </section>
      </div>
      <aside className="stack"><MonthAside base={base} /></aside>
    </div>
  );
}

// State 2 · plan ready, waiting for VATSIM.
export function PlanView({ base, ofp, expiresInMin, positioningNm }: { base: Base; ofp: OfpSummary; expiresInMin: number; positioningNm: number | null }) {
  const left = expiresInMin;
  const blockPlan = minsBetween(ofp.sched.out, ofp.sched.in);
  const w = ofp.weights;
  return (
    <div className="main">
      <div className="stack">
        <section className="panel">
          <Head ofp={ofp} tag={<span className="tag plan">תוכנית מוכנה</span>}>
            נוצרה ב-SimBrief ב-<bdi>{z(ofp.generated_at)}Z</bdi>{left != null && <> · פגה בעוד <b>{hm(left)}</b></>}
          </Head>
          <div className="idle" style={{ padding: 14 }}>
            <div className="ring" aria-hidden>…</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>ממתין לחיבור ל-VATSIM</div>
              <div className="muted">
                התחבר עם <bdi>CID {base.settings.vatsimCid}</bdi>{ofp.callsign && <> ואות הקריאה <bdi>{ofp.callsign}</bdi></>}. המעקב יתחיל לבד.
              </div>
            </div>
          </div>
          <div className="metrics">
            <div className="metric"><div className="label">נוסעים</div><div className="v">{nf(w.pax)} <small>/ {nf(ofp.aircraft.seats)}</small></div></div>
            <div className="metric"><div className="label">מטען משלם</div><div className="v">{nf(w.freight_kg)} <small>ק״ג</small></div></div>
            <div className="metric"><div className="label">MTOW</div><div className="v">{w.mtow_kg ? (w.mtow_kg / 1000).toFixed(1) : '—'} <small>ט׳</small></div></div>
            <div className="metric"><div className="label">מרחק</div><div className="v">{nf(ofp.route_distance_nm)} <small>NM</small></div></div>
            <div className="metric"><div className="label">בלוק מתוכנן</div><div className="v">{hm(blockPlan)}</div></div>
            <div className="metric"><div className="label">OUT מתוכנן</div><div className="v">{z(ofp.sched.out)}<small>Z</small></div></div>
          </div>
          <ul className="checks">
            {positioningNm ? (
              <li className="warn">המוצא <bdi>{ofp.origin.icao}</bdi> אינו מיקום הצוות (<bdi>{base.crew.icao}</bdi>): תחויב הקפצת צוות, {nf(positioningNm)} NM</li>
            ) : <li>המוצא <bdi>{ofp.origin.icao}</bdi> הוא מיקום הצוות, אין הקפצת צוות</li>}
            {w.mtow_kg && ofp.aircraft.seats
              ? <li>המטוס <bdi>{ofp.aircraft.type}</bdi>: משקלים ומושבים התקבלו מה-OFP</li>
              : <li className="warn">חסרים משקלים או מושבים ב-OFP: ההוצאות האוטומטיות יחושבו חלקית</li>}
            <li className="wait">מחכה לחיבור ל-VATSIM</li>
          </ul>
          <div className="actions">
            <Link className="btn btn-sm" href="/?manual=1">טיסה ידנית (בלי VATSIM)</Link>
          </div>
        </section>
      </div>
      <aside className="stack">
        <section className="panel">
          <div className="panel-head"><span className="label">מה יקרה עכשיו</span></div>
          <div className="pb small" style={{ lineHeight: 1.7 }}>
            ברגע שתתחבר, המערכת מזהה אותך לפי ה-CID, אות הקריאה, המוצא והיעד, ומתחילה לעקוב.<br />
            אין צורך ללחוץ על שום דבר.<br /><br />
            <b style={{ color: 'var(--ink)' }}>טיסה ידנית</b> נועדה רק למקרה שלא תתחבר ל-VATSIM בכלל. בסוף תזין 4 זמנים.
          </div>
        </section>
        <MonthAside base={base} />
      </aside>
    </div>
  );
}
