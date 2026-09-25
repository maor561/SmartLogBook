'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { THEME_COOKIE } from '@/lib/constants';

// Manual theme override (ADR-016). 'auto' removes it so the OS preference applies.
export async function setTheme(theme: 'auto' | 'light' | 'dark') {
  await verifySession();
  const store = await cookies();
  if (theme === 'auto') store.delete(THEME_COOKIE);
  else store.set(THEME_COOKIE, theme, { path: '/', maxAge: 365 * 24 * 3600, sameSite: 'lax', secure: true });
  revalidatePath('/', 'layout');
}
