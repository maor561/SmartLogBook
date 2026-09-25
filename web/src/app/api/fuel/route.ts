import { NextResponse } from 'next/server';
import { getSession } from '@/lib/dal';
import { hasDb } from '@/lib/db';
import { currentFuelPrice } from '@/lib/eia';
import { fuelSurcharge } from '@/lib/engine';
import { getSettings, listRateVersions } from '@/lib/settings';

// Current EIA fuel price and the surcharge it gives under the active rate version.
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: 'no database' }, { status: 503 });

  const [price, settings, versions] = await Promise.all([currentFuelPrice(), getSettings(), listRateVersions()]);
  const params = versions.find((v) => v.id === settings.currentRateSetId)!.params;
  return NextResponse.json({
    keyConfigured: Boolean(process.env.EIA_API_KEY),
    price,
    refUsdPerKg: params.fuel.refUsdPerKg,
    surchargePct: Math.round(fuelSurcharge(params, price?.usdPerKg ?? null) * 1000) / 10,
  });
}
