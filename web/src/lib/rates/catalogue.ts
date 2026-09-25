// What the settings screen shows for each rate parameter (sketch s6, ADR-041).
// Paths must cover every leaf of RateParams — checked by test/rates.test.mjs.

export type Field = { path: string; name: string; unit?: string };
export type Group = { title: string; formula: string; open?: boolean; items: (Field | { heading: string })[] };

const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const GROUPS: Group[] = [
  { title: 'מחיר כרטיס', formula: 'F0 + K × NM^p', open: true, items: [
    { path: 'fare.f0', name: 'מחיר קבוע (F0)', unit: '$' },
    { path: 'fare.k', name: 'מקדם מרחק (K)' },
    { path: 'fare.exp', name: 'חזקת המרחק' },
    { path: 'loadFactor.a', name: 'תפוסה: בסיס' },
    { path: 'loadFactor.b', name: 'תפוסה: מקדם LF²' },
    { path: 'clamp.min', name: 'מעקה: מינימום', unit: '×' },
    { path: 'clamp.max', name: 'מעקה: מקסימום', unit: '×' },
    { path: 'reputation.maxPct', name: 'מוניטין: השפעה מרבית', unit: '%' },
  ] },
  { title: 'עונה, יום ושעה', formula: 'מכפילים על מחיר הבסיס', items: [
    { heading: 'חודש' },
    ...MONTHS.map((m, i) => ({ path: `season.${i}`, name: m, unit: '×' })),
    { heading: 'יום בשבוע' },
    ...DAYS.map((d, i) => ({ path: `dow.${i}`, name: d, unit: '×' })),
    { heading: 'שעה מקומית' },
    { path: 'hour.night', name: '00–06', unit: '×' },
    { path: 'hour.am', name: '06–10', unit: '×' },
    { path: 'hour.day', name: '10–17', unit: '×' },
    { path: 'hour.pm', name: '17–22', unit: '×' },
    { path: 'hour.late', name: '22–24', unit: '×' },
  ] },
  { title: 'תוספת דלק', formula: 's × (EIA / ref − 1)', items: [
    { path: 'fuel.sensitivity', name: 'רגישות' },
    { path: 'fuel.refUsdPerKg', name: 'מחיר ייחוס', unit: '$/ק״ג' },
    { path: 'fuel.minPct', name: 'תחתית', unit: '%' },
    { path: 'fuel.maxPct', name: 'תקרה', unit: '%' },
  ] },
  { title: 'מטען', formula: '(a + b × NM^c) $/kg', items: [
    { path: 'cargo.a', name: 'בסיס', unit: '$/ק״ג' },
    { path: 'cargo.b', name: 'מקדם מרחק' },
    { path: 'cargo.c', name: 'חזקה' },
  ] },
  { title: 'טייסים ודיילים', formula: 'max(block, min) × (cpt + fo + extra + fa × ⌈seats/n⌉)', items: [
    { path: 'crew.captain', name: 'קברניט', unit: '$/שעה' },
    { path: 'crew.firstOfficer', name: 'טייס משנה', unit: '$/שעה' },
    { path: 'crew.relief', name: 'טייס נוסף', unit: '$/שעה' },
    { path: 'crew.attendant', name: 'דייל', unit: '$/שעה' },
    { path: 'crew.seatsPerAttendant', name: 'מושבים לדייל' },
    { path: 'crew.minHours', name: 'מינימום תשלום', unit: 'שעות' },
    { path: 'crew.relief3AboveHours', name: 'טייס שלישי מעל', unit: 'שעות' },
    { path: 'crew.relief4AboveHours', name: 'טייס רביעי מעל', unit: 'שעות' },
  ] },
  { title: 'תחזוקה', formula: 'air × (a + b × MTOW) + c × MTOW', items: [
    { path: 'maintenance.perAirHour', name: 'בסיס לשעת אוויר', unit: '$' },
    { path: 'maintenance.perAirHourPerMtowT', name: 'לטון MTOW לשעה', unit: '$' },
    { path: 'maintenance.perCyclePerMtowT', name: 'לכל מחזור, לטון', unit: '$' },
  ] },
  { title: 'עמלות שדה וניווט', formula: 'a × MTOW + b × pax · nav × km/100 × √(MTOW/ref)', items: [
    { path: 'fees.landingPerMtowT', name: 'נחיתה לטון MTOW', unit: '$' },
    { path: 'fees.airportPerPax', name: 'שדה לנוסע', unit: '$' },
    { path: 'nav.per100km', name: 'ניווט ל-100 ק״מ', unit: '$' },
    { path: 'nav.refMtowT', name: 'משקל ייחוס', unit: 'טון' },
  ] },
  { title: 'חכירת מטוס', formula: 'block × a × MTOW', items: [
    { path: 'lease.perBlockHourPerMtowT', name: 'לשעת בלוק לטון MTOW', unit: '$' },
  ] },
  { title: 'קנס נחיתה קשה', formula: 'לפי FPM · $ × MTOW', items: [
    { heading: 'ספים (FPM)' },
    { path: 'hardLanding.freeUpToFpm', name: 'ללא קנס עד', unit: 'FPM' },
    { path: 'hardLanding.visualUpToFpm', name: 'בדיקה ויזואלית עד', unit: 'FPM' },
    { path: 'hardLanding.ammUpToFpm', name: 'בדיקת AMM עד', unit: 'FPM' },
    { heading: 'קנס לטון MTOW' },
    { path: 'hardLanding.visualPerMtowT', name: 'בדיקה ויזואלית', unit: '$' },
    { path: 'hardLanding.ammPerMtowT', name: 'בדיקת AMM', unit: '$' },
    { path: 'hardLanding.structuralPerMtowT', name: 'בדיקה מבנית', unit: '$' },
  ] },
  { title: 'הקפצת צוות והסטה', formula: 'אנשים × מחיר בסיס למרחק', items: [
    { path: 'positioning.freeUnderNm', name: 'הקפצה חינם מתחת ל', unit: 'NM' },
    { path: 'diversion.busUnderNm', name: 'הסעה באוטובוס מתחת ל', unit: 'NM' },
    { path: 'diversion.busPerPax', name: 'הסעה באוטובוס לנוסע', unit: '$' },
  ] },
];

export const FIELDS: Field[] = GROUPS.flatMap((g) => g.items.filter((i): i is Field => 'path' in i));
export const LABEL: Record<string, string> = Object.fromEntries(
  GROUPS.flatMap((g) => g.items.filter((i): i is Field => 'path' in i).map((f) => [f.path, `${g.title} · ${f.name}`])),
);
