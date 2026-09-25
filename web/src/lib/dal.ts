import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, readSession } from './session';

// Data Access Layer (Next.js authentication guide): every page and API call
// verifies the session here, close to the data — the proxy is only an
// optimistic first filter.

/** For pages and server actions: redirects to /login when not signed in. */
export const verifySession = cache(async () => {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  return session;
});

/** For route handlers: returns null instead of redirecting, so the handler can answer 401. */
export const getSession = cache(async () => readSession((await cookies()).get(SESSION_COOKIE)?.value));
