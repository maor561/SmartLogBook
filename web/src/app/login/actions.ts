'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';
import { db, hasDb } from '@/lib/db';

export type LoginState = { error?: string } | undefined;

// Failed-attempt limits (ADR-031, 041), two layers:
// - per IP, in memory: 5 failures → 15 min. Stops a single guesser fast.
// - global, in users row: 20 failures → 15 min. Survives across server
//   instances, so spreading guesses over IPs or cold starts doesn't help.
const IP_MAX = 5;
const GLOBAL_MAX = 20;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

async function clientKey() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

const lockedMsg = (until: number) =>
  `יותר מדי ניסיונות. נסה שוב בעוד ${Math.ceil((until - Date.now()) / 60000)} דק׳.`;

async function globalLockedUntil(): Promise<number> {
  if (!hasDb()) return 0;
  const [row] = await db()`SELECT locked_until FROM users WHERE id = 1`;
  const t = row?.locked_until ? new Date(row.locked_until).getTime() : 0;
  return t > Date.now() ? t : 0;
}

async function recordGlobal(ok: boolean) {
  if (!hasDb()) return;
  if (ok) {
    await db()`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = 1`;
  } else {
    await db()`UPDATE users SET
      failed_attempts = CASE WHEN failed_attempts + 1 >= ${GLOBAL_MAX} THEN 0 ELSE failed_attempts + 1 END,
      locked_until = CASE WHEN failed_attempts + 1 >= ${GLOBAL_MAX} THEN now() + ${`${LOCK_MS / 1000} seconds`}::interval ELSE locked_until END
      WHERE id = 1`;
  }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = await clientKey();
  const entry = failures.get(key);
  if (entry && entry.lockedUntil > Date.now()) return { error: lockedMsg(entry.lockedUntil) };
  const globalUntil = await globalLockedUntil();
  if (globalUntil) return { error: lockedMsg(globalUntil) };

  const ok = await verifyPassword(String(formData.get('password') ?? ''));
  await recordGlobal(ok);
  if (!ok) {
    const count = (entry?.count ?? 0) + 1;
    failures.set(key, { count, lockedUntil: count >= IP_MAX ? Date.now() + LOCK_MS : 0 });
    return { error: 'סיסמה שגויה' };
  }

  failures.delete(key);
  await createSession();
  redirect('/');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
