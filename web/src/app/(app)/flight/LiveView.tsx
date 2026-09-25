'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTracker } from '@/components/TrackerProvider';
import type { TrackerDoc } from '@/lib/flight-view';
import type { OfpSummary } from '@/lib/ofp';
import { distanceNm } from '@/lib/geo';
import { hm, minsBetween, nf, z } from '@/lib/format';
import { TIME_LABEL } from '@/lib/flight-input';
import { Head } from './Parts';

const PHASES = ['בגייט', 'הסעה', 'באוויר', 'הסעה לגייט', 'בחניה'];
const INDEX: Record<string, number> = { armed: 0, taxi_out: 1, airborne: 2, taxi_in: 3, arrived: 4 };
const TAG: Record<string, string> = { armed: 'בגייט', taxi_out: 'בהסעה', airborne: 'באוויר', taxi_in: 'הסעה לגייט' };

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

// States 3 (live) and 4 (disconnected). Server gives the first snapshot; the
// tracker context keeps it fresh without reloading the page.
export function LiveView({ initial, ofp }: { initial: TrackerDoc; ofp: OfpSummary }) {
  const live = useTracker().tracker;
  const t = live && live.ofp?.id === ofp.id ? live : initial;
  const now = useNow();
  const disc = t.state === 'disconnected';
  const phaseState = disc ? t.prev_state ?? 'airborne' : t.state;
  const idx = INDEX[phaseState] ?? 0;
  const s = t.last;

  const o = ofp.origin, d = ofp.dest;
  const total = o.lat != null && d.lat != null ? distanceNm(o.lat, o.lon!, d.lat, d.lon!) : null;
  const flown = s && o.lat != null ? distanceNm(o.lat, o.lon!, s.lat, s.lon) : null;
  const left = s && d.lat != null ? distanceNm(s.lat, s.lon, d.lat, d.lon!) : null;
  const pct = total && flown != null && left != null ? Math.min(100, Math.max(0, (flown / (flown + left)) * 100)) : 0;
  const etaOn = !disc && phaseState === 'airborne' && left != null && s && s.gs_kt > 60 ? new Date(now + (left / s.gs_kt) * 3600e3).toISOString() : null;
  const times = [null, t.out_at, t.off_at, t.on_at, t.in_at];
  const seenAgo = t.last_seen_at ? Math.round((now - Date.parse(t.last_seen_at)) / 1000) : null;

  const deadline = t.disconnected_at ? Date.parse(t.disconnected_at) + 30 * 60e3 : null;
  const remain = deadline ? Math.max(0, deadline - now) : null;

  return (
    <div className="main">
      <div className="stack">
        <section className="panel">
          <Head ofp={ofp} tag={disc ? <span className="tag warn">מנותק</span> : <span className="tag go">{TAG[t.state] ?? t.state}</span>}>
            {!disc && seenAgo != null && <>VATSIM · עודכן לפני {seenAgo < 90 ? `${seenAgo} שנ׳` : `${Math.round(seenAgo / 60)} דק׳`}</>}
            {t.joined && <span className="chip warn" style={{ marginInlineStart: 6 }}>הצטרפות באמצע</span>}
          </Head>

          {disc && (
            <div className="banner warn">
              <div className="grow">
                <b>החיבור ל-VATSIM אבד ב-<bdi>{z(t.disconnected_at)}Z</bdi>.</b> אם תתחבר מחדש עם אותו CID ואות קריאה, המעקב ימשיך באותה טיסה.<br />
                <span className="small">אם לא תתחבר עד <bdi>{deadline ? z(new Date(deadline).toISOString()) : '—'}Z</bdi>, הטיסה תסומן קטועה ותוכל להשלים אותה ידנית או למחוק.</span>
              </div>
              {remain != null && (
                <div style={{ textAlign: 'center' }}>
                  <div className="countdown"><bdi>{`${Math.floor(remain / 60000)}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, '0')}`}</bdi></div>
                  <div className="small">נותר להמתנה</div>
                </div>
              )}
            </div>
          )}

          <ol className={`phases${disc ? ' frozen' : ''}`}>
            {PHASES.map((p, i) => (
              <li key={p} className={i < idx ? 'done' : i === idx ? 'now' : undefined}>
                {p}<i>{i === idx && disc ? `אבד ${z(t.disconnected_at)}` : times[i] ? z(times[i]) : i === 3 && etaOn ? `~${z(etaOn)}` : ''}</i>
              </li>
            ))}
          </ol>

          <div className="track">
            <div className="bar"><div className={`fill${disc ? ' warn' : ''}`} style={{ width: `${pct}%` }} /></div>
            <div className="track-row">
              <bdi>{o.icao}</bdi>
              <span className="muted">
                {disc ? <>מיקום אחרון ידוע: <bdi>{nf(flown != null ? Math.round(flown) : null)} NM</bdi> מהמוצא</>
                  : <>טסו <bdi>{nf(flown != null ? Math.round(flown) : null)} NM</bdi> · נותרו <bdi>{nf(left != null ? Math.round(left) : null)} NM</bdi></>}
              </span>
              <bdi>{d.icao}</bdi>
            </div>
          </div>

          <div className={`metrics${disc ? ' stale' : ''}`}>
            <div className="metric"><div className="label">{disc ? 'גובה אחרון' : 'גובה'}</div><div className="v"><bdi>{s ? (s.alt_ft >= 18000 ? `FL${Math.round(s.alt_ft / 100)}` : `${nf(s.alt_ft)} ft`) : '—'}</bdi></div></div>
            <div className="metric"><div className="label">{disc ? 'מהירות אחרונה' : 'מהירות קרקע'}</div><div className="v">{s ? s.gs_kt : '—'} <small>kt</small></div></div>
            <div className="metric"><div className="label">כיוון</div><div className="v">{s ? `${s.hdg}°` : '—'}</div></div>
            <div className="metric"><div className="label">סקווק</div><div className="v">{s?.squawk ?? '—'}</div></div>
            <div className="metric"><div className="label">זמן באוויר</div><div className="v">{hm(t.off_at ? minsBetween(t.off_at, t.on_at ?? new Date(now).toISOString()) : null)}</div></div>
            <div className="metric"><div className="label">ETA נחיתה</div><div className="v">{etaOn ? <>{z(etaOn)}<small>Z</small></> : '—'}</div></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><span className="label">זמני בלוק · UTC</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th />{(["out", "off", "on", "in"] as const).map((k) => <th key={k} className="n">{TIME_LABEL[k]}</th>)}<th className="n">בלוק</th></tr></thead>
              <tbody>
                <tr>
                  <td>מתוכנן · SimBrief</td>
                  {[ofp.sched.out, ofp.sched.off, ofp.sched.on, ofp.sched.in].map((v, i) => <td key={i} className="n plan-t">{z(v)}</td>)}
                  <td className="n plan-t">{hm(minsBetween(ofp.sched.out, ofp.sched.in))}</td>
                </tr>
                <tr>
                  <td>בפועל · VATSIM</td>
                  {[t.out_at, t.off_at, t.on_at, t.in_at].map((v, i) => <td key={i} className={`n${v ? ' act' : ''}`}>{z(v)}</td>)}
                  <td className="n act">{t.out_at ? `${hm(minsBetween(t.out_at, t.in_at ?? new Date(now).toISOString()))}${t.in_at ? '' : ' ▸'}` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="actions">
            <span className="small">{disc ? 'יודע שלא תחזור?' : 'החיבור לא יציב?'}</span>
            <Link className="btn btn-sm btn-link-plain" href="/?manual=1">{disc ? 'סיים ידנית עכשיו' : 'סיים ידנית'}</Link>
          </div>
        </section>
      </div>
      <aside className="stack">
        <section className="panel">
          <div className="panel-head"><span className="label">{disc ? 'מה נשמר' : 'אחרי GATE'}</span></div>
          <div className="pb small" style={{ lineHeight: 1.7 }}>
            {disc
              ? <>הזמנים שכבר נמדדו ב-VATSIM נשמרים. אם תסיים ידנית, תזין רק את החסרים.</>
              : <>כשתעצור בחניה או תתנתק אחרי הנחיתה, ייפתח כאן טופס ההשלמה.</>}
          </div>
        </section>
      </aside>
    </div>
  );
}
