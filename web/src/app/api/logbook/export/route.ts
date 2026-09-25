import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/dal';
import { hasDb } from '@/lib/db';
import { loadLogbook } from '@/lib/logbook';
import { applyFilters, filtersFromQuery } from '@/lib/logbook-filter';
import { buildWorkbook } from '@/lib/backup';

// GET /api/logbook/export?<same query as the logbook filters> → .xlsx (ADR-013, 023)
export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: 'no database' }, { status: 503 });
  const { flights } = await loadLogbook();
  const list = applyFilters(flights, filtersFromQuery(req.nextUrl.searchParams), new Date());
  const buf = await buildWorkbook(list);
  const name = `smartlogbook-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store',
    },
  });
}
