// Cabin announcements (sketch s14, ADR-061): text only, Hebrew and English, each tied to a moment of
// the real flight. Every figure in them comes from the OFP or from the tracker.
import { MIN, type Anchors, type Sim } from './sim';

export type Announcement = { at: number; key: string; he: string; en: string };
export type PaContext = {
  callsign: string | null;
  dest: string;                       // city, or the ICAO code when the city is unknown
  destUtcOffset: number | null;       // hours; null: times are given in UTC
  cruiseFt: number | null;            // the level the aircraft is at when the captain speaks
};

const hhmm = (t: number) => new Date(t).toISOString().slice(11, 16);
const nf = (n: number) => n.toLocaleString('en-US');

function duration(msLeft: number) {
  const m = Math.max(5, Math.round(msLeft / MIN / 5) * 5), h = Math.floor(m / 60), r = m % 60;
  const he = h === 0 ? `${r} דקות` : `${h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`}${r ? ` ו-${r} דקות` : ''}`;
  const en = h === 0 ? `${r} minutes` : `${h} hour${h > 1 ? 's' : ''}${r ? ` ${r} minutes` : ''}`;
  return { he, en };
}

export function announcements(sim: Sim, c: PaContext): Announcement[] {
  const a: Anchors = sim.a;
  const flight = c.callsign ? `טיסה ${c.callsign}` : 'הטיסה', flightEn = c.callsign ? `flight ${c.callsign}` : 'this flight';
  const local = (t: number) => (c.destUtcOffset == null
    ? { he: `${hhmm(t)} UTC`, en: `${hhmm(t)} UTC` }
    : { he: `${hhmm(t + c.destUtcOffset * 3600e3)} שעון מקומי`, en: `${hhmm(t + c.destUtcOffset * 3600e3)} local time` });
  const left = duration(a.on - a.toc), land = local(a.on), now = local(a.on + 1.5 * MIN);
  const level = c.cruiseFt ? Math.round(c.cruiseFt / 1000) * 1000 : null;
  const service = sim.drink != null;

  const list: Announcement[] = [
    { at: a.out + 1 * MIN, key: 'welcome',
      he: `ברוכים הבאים ל${flight} אל ${c.dest}. אנא שבו במקומותיכם והדקו את חגורות הבטיחות.`,
      en: `Welcome aboard ${flightEn} to ${c.dest}. Please take your seats and fasten your seat belts.` },
    { at: a.out + 2.5 * MIN, key: 'demo',
      he: 'אנא הפנו את תשומת לבכם לצוות להדגמת הוראות הבטיחות.',
      en: 'Please direct your attention to the cabin crew for the safety demonstration.' },
    { at: Math.max(a.off - 3 * MIN, a.out + 6 * MIN), key: 'takeoff',
      he: 'צוות, להתיישב להמראה.', en: 'Cabin crew, please be seated for takeoff.' },
    { at: a.beltOff, key: 'belt-off',
      he: `שלט החגורות כבה. מומלץ להישאר חגורים בזמן הישיבה.${service ? ' בקרוב נתחיל בשירות.' : ''}`,
      en: `The seat belt sign is off. We recommend keeping your seat belt fastened while seated.${service ? ' Service will begin shortly.' : ''}` },
    { at: a.toc + 2 * MIN, key: 'captain',
      he: `כאן הקברניט.${level ? ` אנחנו בגובה שיוט של ${nf(level)} רגל.` : ''} נותרו בערך ${left.he} לטיסה, והנחיתה צפויה ב-${land.he}.`,
      en: `This is your captain.${level ? ` We are cruising at ${nf(level)} feet.` : ''} About ${left.en} of flight remain, landing at about ${land.en}.` },
    ...(sim.sales ? [{ at: sim.sales.start, key: 'sales',
      he: 'בדקות הקרובות יעברו הדיילים עם עגלת המכירות.',
      en: 'The cabin crew will shortly pass through the cabin with the duty-free trolley.' }] : []),
    { at: a.tod, key: 'descent',
      he: `התחלנו בהנמכה לקראת הנחיתה ב-${c.dest}. אנא חזרו למקומותיכם.`,
      en: `We have started our descent into ${c.dest}. Please return to your seats.` },
    { at: a.beltOn, key: 'belt-on',
      he: 'שלט החגורות דולק. אנא הדקו חגורות, יישרו את המושבים וקפלו את המגשים.',
      en: 'The seat belt sign is on. Please fasten your seat belts, bring your seat upright and stow your tray table.' },
    { at: a.on + 1.5 * MIN, key: 'landed',
      he: `ברוכים הבאים ל-${c.dest}. השעה ${now.he}. אנא הישארו חגורים עד לעצירה המלאה.`,
      en: `Welcome to ${c.dest}. The time is ${now.en}. Please remain seated until the aircraft has come to a complete stop.` },
    { at: a.in, key: 'gate',
      he: 'תודה שטסתם איתנו. היציאה מהדלת הקדמית.', en: 'Thank you for flying with us. Please exit through the forward door.' },
  ];
  // The sign never goes off on a flight that stays low: no sign announcements, and no captain's cruise report.
  const low = !Number.isFinite(a.beltOff);
  return list.filter((x) => Number.isFinite(x.at) && !(low && ['belt-off', 'belt-on', 'captain'].includes(x.key))).sort((x, y) => x.at - y.at);
}
