'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';

export type LoginState = { error?: string } | undefined;

// Failed-attempt limiter (ADR-031). Per server instance only — a durable lock
// (users.failed_attempts / locked_until) arrives with the database in WP2.
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

async function clientKey() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = await clientKey();
  const entry = failures.get(key);
  if (entry && entry.lockedUntil > Date.now()) {
    const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return { error: `יותר מדי ניסיונות. נסה שוב בעוד ${minutes} דק׳.` };
  }

  const ok = await verifyPassword(String(formData.get('password') ?? ''));
  if (!ok) {
    const count = (entry?.count ?? 0) + 1;
    failures.set(key, { count, lockedUntil: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
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
