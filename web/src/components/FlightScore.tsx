import { ON_TIME_MIN, SCORE_RANGE, SCORE_WEIGHT, scoreTone, scoreVerdict, type FlightScore, type ScorePart } from '@/lib/flight-score';

// Flight score (sketch s9, ADR-058): the total, and where every point came from
// (ADR-006: every number has a source). Used by the completion form and the logbook.

export function Stars({ v }: { v: number }) {
  const n = Math.round(v);
  return <span className="stars" aria-label={`${v.toFixed(1)} מתוך 5`}>{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;
}

export function ScoreDot({ score }: { score: FlightScore | null }) {
  if (!score) return <span className="muted">—</span>;
  return <span className={`sc-dot ${scoreTone(score.total)}`}><i />{score.total.toFixed(1)}{score.partial && <span className="chip">חלקי</span>}</span>;
}

const pct = (k: ScorePart) => `${Math.round(SCORE_WEIGHT[k] * 100)}%`;
const OnTime = ({ min }: { min: number }) => (min <= ON_TIME_MIN ? <span className="chip go">בזמן</span> : <span className="chip warn">באיחור</span>);

export function ScoreCard({ score, compact = false }: { score: FlightScore; compact?: boolean }) {
  const { input: i, parts } = score, R = SCORE_RANGE;
  const rows: { k: ScorePart; name: string; why: React.ReactNode; rule: string }[] = [
    {
      k: 'dep', name: 'יציאה', rule: `מלא עד ${R.dep.good} דק׳ · אפס מ-${R.dep.bad} דק׳`,
      why: i.depLateMin == null ? 'אין זמן יציאה או שעה מתוכננת'
        : <>PUSHBACK {i.depLateMin === 0 ? 'בדיוק לפי המתוכנן' : i.depLateMin < 0 ? `${-i.depLateMin} דק׳ לפני המתוכנן` : `${i.depLateMin} דק׳ אחרי המתוכנן`} <OnTime min={i.depLateMin} /></>,
    },
    {
      k: 'dur', name: 'משך הטיסה', rule: `מלא עד ${R.dur.good} דק׳ · אפס מ-${R.dur.bad} דק׳`,
      why: i.durOverMin == null ? 'אין זמני בלוק מלאים'
        : <>הבלוק {i.durOverMin === 0 ? 'בדיוק כמתוכנן' : i.durOverMin < 0 ? `קצר ב-${-i.durOverMin} דק׳ מהמתוכנן` : `ארוך ב-${i.durOverMin} דק׳ מהמתוכנן`} <OnTime min={i.durOverMin} /></>,
    },
    {
      k: 'land', name: 'נחיתה', rule: `מלא עד ${R.land.good} · אפס מ-${R.land.bad}`,
      why: i.fpm == null ? 'לא הוזן FPM'
        : <><bdi className="ltr">−{i.fpm} FPM</bdi> {i.fpm <= 200 ? <span className="chip go">רכה</span> : i.fpm > 400 ? <span className="chip bad">קשה</span> : <span className="chip">רגילה</span>}</>,
    },
  ];
  return (
    <div className={`sc${compact ? ' compact' : ''}`}>
      <div className="sc-total">
        <div className="v">{score.total.toFixed(1)}<small> / 5</small></div>
        <div><Stars v={score.total} /><div className="small">{scoreVerdict(score.total)}{score.partial && ' · חלקי: רכיב בלי נתון לא נספר'}</div></div>
      </div>
      <div className="sc-parts">
        {rows.map(({ k, name, why, rule }) => (
          <div key={k} className="sc-part">
            <div className="nm">{name}<small>{pct(k)} מהציון</small></div>
            <div className="pts">{parts[k] == null ? '—' : parts[k]!.toFixed(1)}</div>
            <div className="why">{why}<small>{rule}</small>
              <div className="meter"><div className={parts[k] == null ? '' : scoreTone(parts[k]!)} style={{ width: `${((parts[k] ?? 0) / 5) * 100}%` }} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
