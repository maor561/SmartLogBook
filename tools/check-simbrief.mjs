// WP0 · checks that the latest OFP of a SimBrief account contains every field
// the new system depends on (ADR-024/025/026/028/034).
//   node tools/check-simbrief.mjs --userid 123456
//   node tools/check-simbrief.mjs --username myalias
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const userid = arg('userid'), username = arg('username'), file = arg('file');
if (!userid && !username && !file) { console.error('usage: node tools/check-simbrief.mjs --userid <Pilot ID> | --username <alias> | --file <ofp.json>'); process.exit(1); }

let ofp;
if (file) {
  ofp = JSON.parse((await import('node:fs')).readFileSync(file, 'utf8'));
} else {
  const q = userid ? `userid=${encodeURIComponent(userid)}` : `username=${encodeURIComponent(username)}`;
  const res = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${q}&json=1`);
  ofp = await res.json();
  if (!res.ok || !ofp.params) { console.error(`SimBrief: ${ofp?.fetch?.status || res.status}`); process.exit(1); }
}

const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ofp);
const REQUIRED = [
  ['params.request_id', 'זיהוי התוכנית (החלפה או תפוגה, ADR-020)'],
  ['params.time_generated', 'מתי נוצרה'],
  ['atc.callsign', 'התאמה ל-VATSIM (ADR-024)'],
  ['origin.icao_code', 'מוצא'], ['destination.icao_code', 'יעד'],
  ['origin.pos_lat', 'קואורדינטות מוצא'], ['destination.pos_lat', 'קואורדינטות יעד'],
  ['general.route_distance', 'מרחק (ADR-025)'],
  ['aircraft.icao_code', 'סוג מטוס'], ['aircraft.reg', 'רישום (ADR-032)'],
  ['aircraft.max_passengers', 'מושבים: תפוסה וצוות (ADR-025, 028)'],
  ['weights.max_tow', 'MTOW: כל ההוצאות (ADR-028)'],
  ['weights.pax_count', 'נוסעים'],
  ['weights.freight_added', 'מטען משלם (ADR-039)'],
  ['weights.cargo', 'מזוודות ומטען (בדיקת עקביות)'],
  ['weights.bag_count', 'מזוודות'],
  ['weights.pax_weight', 'משקל נוסע'], ['weights.bag_weight', 'משקל מזוודה'],
  ['times.sched_out', 'OUT מתוכנן: דיוק (ADR-035)'],
  ['times.orig_timezone', 'שעה מקומית: מכפיל שעה (ADR-025)'],
];
let missing = 0;
console.log(`OFP ${get('atc.callsign')} ${get('origin.icao_code')}→${get('destination.icao_code')} · ${get('aircraft.icao_code')} ${get('aircraft.reg')} · generated ${new Date(get('params.time_generated') * 1000).toISOString()}\n`);
for (const [path, why] of REQUIRED) {
  const v = get(path);
  const ok = v !== undefined && v !== null && v !== '';
  if (!ok) missing++;
  console.log(`${ok ? '✔' : '✖'} ${path.padEnd(24)} ${ok ? String(v).padEnd(14) : '(missing)'.padEnd(14)} ${why}`);
}
const n = (p) => +get(p);
const bags = n('weights.bag_count') * n('weights.bag_weight');
const payloadOk = n('weights.pax_count') * n('weights.pax_weight') + n('weights.cargo') === n('weights.payload');
const freightOk = n('weights.cargo') - bags === n('weights.freight_added');
console.log(`
payload ${n('weights.payload')} = pax ${n('weights.pax_count')} × ${n('weights.pax_weight')} + cargo ${n('weights.cargo')} → ${payloadOk ? '✔' : '✖'}`);
console.log(`cargo ${n('weights.cargo')} − bags ${bags} = freight_added ${n('weights.freight_added')} → ${freightOk ? '✔' : '✖ לבדוק'} (ADR-039)`);
if (!payloadOk || !freightOk) missing++;
console.log(missing ? `\n${missing} שדות חסרים` : '\nכל השדות הנדרשים קיימים');
process.exit(missing ? 1 : 0);
