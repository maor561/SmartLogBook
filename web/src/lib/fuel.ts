// EIA response → $/kg (ADR-025). Pure, so it can be tested without the network.
// Series: weekly U.S. Gulf Coast kerosene-type jet fuel spot price, $/gal.
export const EIA_SERIES = 'EER_EPJK_PF4_RGC_DPG';
export const KG_PER_GAL = 3.785411784 * 0.8;    // jet A density ≈ 0.80 kg/L

export function parseEia(json: unknown): { week: string; usdPerKg: number } | null {
  const row = (json as { response?: { data?: { period?: string; value?: string | number }[] } })?.response?.data?.[0];
  const perGal = Number(row?.value);
  if (!row?.period || !Number.isFinite(perGal) || perGal <= 0) return null;
  return { week: row.period, usdPerKg: Math.round((perGal / KG_PER_GAL) * 1e4) / 1e4 };
}
