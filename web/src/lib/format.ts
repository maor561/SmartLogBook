// Display helpers. Times are UTC ("Z") everywhere in the cockpit screens.
export const usd = (cents: number, signed = true) => {
  const v = Math.round(Math.abs(cents) / 100).toLocaleString('en-US');
  return cents < 0 ? `−$${v}` : `${signed && cents > 0 ? '+' : ''}$${v}`;
};
export const hm = (min: number | null | undefined) =>
  min == null || !Number.isFinite(min) ? '—' : `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`;
export const z = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(11, 16) : '—');
export const ddmm = (iso: string) => { const d = new Date(iso); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
export const minsBetween = (a: string | null, b: string | null) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60000) : null);
export const nf = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
