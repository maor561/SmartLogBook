import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/constants';

// Optimistic filter only (cookie present?). The real check is the DAL
// (src/lib/dal.ts), which every page, action and API route calls.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith('/api/')) {
    return hasCookie ? NextResponse.next() : NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (pathname === '/login') return NextResponse.next();
  if (!hasCookie) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)'],
};
