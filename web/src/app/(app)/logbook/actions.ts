'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { deleteFlight, editFlight, type EditInput } from '@/lib/logbook';
import { readBackup, restoreMissing } from '@/lib/backup';

export type Result = { ok: true; message?: string } | { ok: false; errors: string[] };

export async function editFlightAction(id: number, input: EditInput): Promise<Result> {
  await verifySession();
  const r = await editFlight(id, input);
  if (r.ok) { revalidatePath('/logbook'); revalidatePath('/'); }
  return r;
}

export async function deleteFlightAction(id: number): Promise<Result> {
  await verifySession();
  const ok = await deleteFlight(id);
  revalidatePath('/logbook'); revalidatePath('/');
  return ok ? { ok: true } : { ok: false, errors: ['הטיסה לא נמצאה'] };
}

const MAX_BYTES = 4 * 1024 * 1024 - 64 * 1024;   // under next.config bodySizeLimit

// Restore from an exported file only (ADR-013).
export async function importBackupAction(form: FormData): Promise<Result> {
  await verifySession();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return { ok: false, errors: ['לא נבחר קובץ'] };
  if (file.size > MAX_BYTES) return { ok: false, errors: ['הקובץ גדול מדי'] };
  try {
    const backup = await readBackup(await file.arrayBuffer());
    const { restored, skipped } = await restoreMissing(backup);
    revalidatePath('/logbook'); revalidatePath('/');
    return { ok: true, message: restored ? `שוחזרו ${restored} טיסות · ${skipped} כבר היו בלוגבוק` : `אין מה לשחזר · כל ${skipped} הטיסות כבר בלוגבוק` };
  } catch (e) {
    return { ok: false, errors: [(e as Error).message] };
  }
}
