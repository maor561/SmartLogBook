'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { LogFlight } from '@/lib/logbook-filter';
import type { ApPoint } from '@/lib/logbook';
import { scoreOf } from '@/lib/flight-score';
import { CARD, cardFileName, cardMap, cardScene, type CardData, type CardLang, type Item } from '@/lib/flight-card';

// Flight summary as a picture (sketch s11, ADR-059). The scene comes from the
// pure library; here it is painted on a canvas with the page's own font, so the
// downloaded PNG looks exactly like the preview.

type Geo = { land: GeoPermissibleObjects; borders: GeoPermissibleObjects };

function paint(ctx: CanvasRenderingContext2D, items: Item[], family: string) {
  const font = (size: number, weight: number) => `${weight} ${size}px ${family}`;
  const round = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  ctx.clearRect(0, 0, CARD, CARD);
  ctx.textBaseline = 'alphabetic';
  for (const it of items) {
    ctx.save();
    switch (it.t) {
      case 'rect':
        round(it.x, it.y, it.w, it.h, it.r ?? 0);
        if (it.fill) { ctx.fillStyle = it.fill; ctx.fill(); }
        if (it.stroke) { ctx.strokeStyle = it.stroke; ctx.lineWidth = 1; ctx.stroke(); }
        break;
      case 'line':
        ctx.strokeStyle = it.stroke; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(it.x1, it.y1); ctx.lineTo(it.x2, it.y2); ctx.stroke();
        break;
      case 'dot':
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fillStyle = it.fill; ctx.fill(); ctx.strokeStyle = it.stroke; ctx.lineWidth = it.width; ctx.stroke();
        break;
      case 'map': {
        round(it.x, it.y, it.w, it.h, it.r); ctx.clip();
        ctx.fillStyle = it.sea; ctx.fillRect(it.x, it.y, it.w, it.h);
        if (it.map) {
          ctx.translate(it.x, it.y);
          ctx.fillStyle = it.land; ctx.fill(new Path2D(it.map.land));
          ctx.strokeStyle = it.border; ctx.lineWidth = 1; ctx.stroke(new Path2D(it.map.borders));
          const arc = new Path2D(it.map.arc);
          ctx.lineCap = 'round'; ctx.strokeStyle = it.arc;
          ctx.shadowColor = it.arc; ctx.shadowBlur = 18; ctx.lineWidth = 4; ctx.stroke(arc);      // glow under the route
          ctx.shadowBlur = 0; ctx.stroke(arc);
          ctx.translate(-it.x, -it.y);
        }
        ctx.restore(); ctx.save();
        round(it.x, it.y, it.w, it.h, it.r); ctx.strokeStyle = it.frame; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      case 'text':
        ctx.font = font(it.size, it.weight);
        ctx.direction = it.rtl ? 'rtl' : 'ltr';
        ctx.textAlign = it.align;                                   // 'left' / 'right' are physical in both directions
        if (it.spacing) ctx.letterSpacing = `${it.spacing}px`;
        if (it.halo) { ctx.strokeStyle = it.halo; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeText(it.s, it.x, it.y); }
        ctx.fillStyle = it.fill; ctx.fillText(it.s, it.x, it.y);
        break;
      case 'run': {
        ctx.direction = 'ltr'; ctx.textAlign = 'left';
        const widths = it.parts.map((p) => { ctx.font = font(p.size, p.weight); return ctx.measureText(p.s).width + (p.dx ?? 0); });
        let x = it.cx - widths.reduce((a, b) => a + b, 0) / 2;
        it.parts.forEach((p, k) => { ctx.font = font(p.size, p.weight); ctx.fillStyle = p.fill; ctx.fillText(p.s, x + (p.dx ?? 0), it.y); x += widths[k]; });
        break;
      }
    }
    ctx.restore();
  }
}

function toData(f: LogFlight, airports: Record<string, ApPoint>): CardData {
  const ap = (icao: string) => ({ icao, name: airports[icao]?.name ?? null, lat: airports[icao]?.lat ?? null, lon: airports[icao]?.lon ?? null });
  const s = scoreOf(f);
  return {
    callsign: f.callsign, type: f.aircraft, reg: f.reg, date: f.date, from: ap(f.origin), to: ap(f.dest),
    plannedTo: f.dest !== f.plannedDest ? f.plannedDest : null,
    times: f.times, blockMin: f.blockMin, airMin: f.airMin, fpm: f.fpm, pax: f.pax, seats: f.seats,
    score: s?.total ?? null, depLateMin: s?.input.depLateMin ?? null, profitCents: f.profitCents, source: f.source,
  };
}

export function FlightCardDialog({ flight, airports, onClose }: { flight: LogFlight; airports: Record<string, ApPoint>; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [lang, setLang] = useState<CardLang>('he');
  const [profit, setProfit] = useState(true);
  const [geo, setGeo] = useState<Geo | null>(null);
  // sharing a file needs a share sheet that takes files: phones, not most desktops
  const [canShare] = useState(() => typeof navigator !== 'undefined' && Boolean(navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] })));
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { dlg.current?.showModal(); }, []);
  // The same Natural Earth data as the logbook map, loaded only when a card is opened.
  useEffect(() => {
    let on = true;
    import('world-atlas/countries-50m.json').then((m) => {
      const topo = m.default as unknown as Topology;
      const land = feature(topo, topo.objects.land) as unknown as GeoPermissibleObjects;
      const borders = mesh(topo, topo.objects.countries as GeometryCollection, (a, b) => a !== b) as unknown as GeoPermissibleObjects;
      if (on) setGeo({ land, borders });
    });
    return () => { on = false; };
  }, []);

  const data = useMemo(() => toData(flight, airports), [flight, airports]);
  const map = useMemo(() => {
    const a = data.from, b = data.to;
    if (!geo || a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null;
    return cardMap(geo.land, geo.borders, [a.lon, a.lat], [b.lon, b.lat]);
  }, [geo, data]);
  const scene = useMemo(() => cardScene(data, map, { lang, profit }), [data, map, lang, profit]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const family = getComputedStyle(document.body).fontFamily;
    let on = true;
    // Canvas text does not wait for web fonts: make sure the weights we use are in, Hebrew included.
    Promise.all([400, 600, 700, 800].map((w) => document.fonts.load(`${w} 32px ${family}`, 'Aאב1'))).catch(() => {}).then(() => { if (on) paint(ctx, scene, family); });
    return () => { on = false; };
  }, [scene]);

  const blob = () => new Promise<Blob | null>((res) => canvas.current?.toBlob(res, 'image/png') ?? res(null));
  async function download() {
    const b = await blob(); if (!b) return setMsg('לא הצלחתי ליצור את התמונה');
    const url = URL.createObjectURL(b), a = document.createElement('a');
    a.href = url; a.download = cardFileName(data); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share() {
    const b = await blob(); if (!b) return setMsg('לא הצלחתי ליצור את התמונה');
    try { await navigator.share({ files: [new File([b], cardFileName(data), { type: 'image/png' })] }); }
    catch (e) { if ((e as Error).name !== 'AbortError') setMsg('השיתוף לא הצליח. אפשר להוריד את התמונה במקום.'); }
  }

  return (
    <dialog ref={dlg} className="dlg card-dlg" onClose={onClose}>
      <div className="dh">סיכום הטיסה</div>
      <div className="db">
        <canvas ref={canvas} width={CARD} height={CARD} className="card-canvas" role="img"
          aria-label={`${flight.callsign ?? ''} ${flight.origin} ${flight.dest}`} />
        {msg && <div className="err" role="alert">{msg}</div>}
      </div>
      <div className="df card-bar">
        <div className="seg" role="group" aria-label="שפה">
          <button type="button" aria-pressed={lang === 'he'} onClick={() => setLang('he')}>עברית</button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
        </div>
        <div className="seg" role="group" aria-label="רווח">
          <button type="button" aria-pressed={profit} onClick={() => setProfit(true)}>עם רווח</button>
          <button type="button" aria-pressed={!profit} onClick={() => setProfit(false)}>בלי רווח</button>
        </div>
        <div className="end">
          <button type="button" className="btn btn-sm" onClick={() => dlg.current?.close()}>סגור</button>
          {canShare && <button type="button" className="btn btn-sm" onClick={share}>שתף</button>}
          <button type="button" className="btn btn-sm btn-primary" onClick={download}>הורד תמונה</button>
        </div>
      </div>
    </dialog>
  );
}
