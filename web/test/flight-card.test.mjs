// WP13 (sketch s11, ADR-059): the flight summary picture. The scene is pure, so
// what ends up in the picture can be checked without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { feature, mesh } from 'topojson-client';
import { cardScene, cardMap, cardFileName, cardMoney, TIME_NAMES, CARD } from '../src/lib/flight-card.ts';

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url), 'utf8'));
const land = feature(topo, topo.objects.land), borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);

const D = (o = {}) => ({
  callsign: 'ELY2569', type: 'B738', reg: 'N738PM', date: '2026-10-02T13:16:00.000Z',
  from: { icao: 'LLBG', name: 'Tel Aviv', lat: 32.0114, lon: 34.8867 }, to: { icao: 'OMDB', name: 'Dubai', lat: 25.2528, lon: 55.3644 }, plannedTo: null,
  times: { out: '2026-10-02T10:04:00Z', off: '2026-10-02T10:18:00Z', on: '2026-10-02T13:09:00Z', in: '2026-10-02T13:16:00Z' },
  blockMin: 192, airMin: 171, fpm: -142, pax: 128, seats: 189, score: 4.9, depLateMin: 4, profitCents: 1_842_000, source: 'tracked', ...o,
});
const texts = (items) => items.flatMap((i) => (i.t === 'text' ? [i.s] : i.t === 'run' ? [i.parts.map((p) => p.s).join('')] : []));
const map = cardMap(land, borders, [34.8867, 32.0114], [55.3644, 25.2528]);

test('the route map: both airports inside the frame, the distance is the great circle', () => {
  assert.equal(map.nm, 1151);
  for (const [x, y] of [map.a, map.b]) assert.ok(x >= 150 && x <= 810 && y >= 90 && y <= 340, `${x},${y}`);
  assert.ok(map.land.length > 500 && map.arc.startsWith('M'));
});

test('a very short hop is not zoomed into the apron, and a same-airport flight still draws', () => {
  const hop = cardMap(land, borders, [34.8867, 32.0114], [35.0, 32.1]);
  assert.ok(Math.hypot(hop.a[0] - hop.b[0], hop.a[1] - hop.b[1]) < 400);
  const local = cardMap(land, borders, [34.8867, 32.0114], [34.8867, 32.0114]);
  assert.deepEqual(local.a, [480, 215]);
  assert.ok(texts(cardScene(D({ to: D().from }), local, { lang: 'en', profit: true })).includes('LLBG · LLBG'));
});

test('Hebrew card: the figures, and the block-time names stay in English', () => {
  const t = texts(cardScene(D(), map, { lang: 'he', profit: true }));
  for (const s of ['ELY2569', 'B738 · N738PM', '2 באוקטובר 2026', 'LLBG', 'OMDB', '1,151 NM', '3:12', '−142FPM', '4.9', '128/ 189', '68% תפוסה', '+$18,420', 'יציאה: בזמן', 'נחיתה רכה', 'נעקבה ב-VATSIM'])
    assert.ok(t.includes(s), `missing "${s}" in ${JSON.stringify(t)}`);
  for (const n of TIME_NAMES) assert.ok(t.includes(n));
  for (const s of ['10:04Z', '10:18Z', '13:09Z', '13:16Z']) assert.ok(t.includes(s));
});

test('English card, and "without profit" swaps the profit for the air time', () => {
  const withP = texts(cardScene(D(), map, { lang: 'en', profit: true }));
  assert.ok(withP.includes('2 Oct 2026') && withP.includes('Net profit') && withP.includes('68% load') && withP.includes('Tracked on VATSIM'));
  const noP = texts(cardScene(D(), map, { lang: 'en', profit: false }));
  assert.ok(!noP.some((s) => s.includes('$')) && !noP.includes('Net profit'));
  assert.ok(noP.includes('Air time') && noP.includes('2:51'));
  for (const n of TIME_NAMES) assert.ok(noP.includes(n));
});

test('RTL mirrors the layout: the callsign is on the right in Hebrew and on the left in English', () => {
  const cs = (lang) => cardScene(D(), map, { lang, profit: true }).find((i) => i.t === 'text' && i.s === 'ELY2569');
  assert.deepEqual([cs('he').x, cs('he').align], [1020, 'right']);
  assert.deepEqual([cs('en').x, cs('en').align], [60, 'left']);
  // everything stays inside the picture
  for (const i of cardScene(D(), map, { lang: 'he', profit: true })) if ('x' in i) assert.ok(i.x >= 0 && i.x <= CARD && i.y >= 0 && i.y <= CARD);
});

test('missing data, a loss and a diversion', () => {
  const t = texts(cardScene(D({ fpm: null, score: null, depLateMin: null, seats: null, times: { out: null, off: null, on: null, in: null }, source: 'manual', profitCents: -421_000, plannedTo: 'LGAV' }), null, { lang: 'he', profit: true }));
  assert.ok(t.includes('הפסד') && t.includes('−$4,210') && t.includes('טיסה ידנית') && t.includes('הוסטה · היעד המתוכנן LGAV'));
  assert.equal(t.filter((s) => s === '—').length, 6);                       // landing, score and the four times
  assert.ok(!t.some((s) => s.includes('NaN') || s.includes('null') || s.includes('undefined')));
});

test('file name and money formatting', () => {
  assert.equal(cardFileName(D()), 'ELY2569-LLBG-OMDB-2026-10-02.png');
  assert.equal(cardMoney(-99_950), '−$1,000');
});
