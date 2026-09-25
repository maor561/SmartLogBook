// Interim site lock for the legacy SmartLogBook (until the 2.0 cutover, WP8).
// Before this, /api/flights and the whole site were readable by anyone with
// the URL. Every request now needs a session cookie issued by a small login
// page. A cookie (not HTTP Basic) because Basic auth prompts are unreliable in
// iOS home-screen web apps.
//
// Requires the SITE_PASSWORD env var in Vercel. If it is missing the site
// stays locked (fail closed) rather than falling back to open.
import { next } from '@vercel/functions';

const COOKIE = 'slb_auth';
const MAX_AGE = 90 * 24 * 3600;   // 90 days, matching ADR-031 for the new app

export const config = {
  // manifest + icons stay public so the PWA can still be installed from the login page
  matcher: ['/((?!manifest\\.json|icons/).*)'],
};

async function token(password) {
  const data = new TextEncoder().encode(`slb-legacy-lock:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

const loginPage = (error) => new Response(`<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SmartLogBook · כניסה</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1216;color:#e6e9ee;font-family:"Segoe UI",Arial,sans-serif}
  form{width:min(320px,90vw);display:grid;gap:12px;background:#171b21;border:1px solid #29303a;border-radius:6px;padding:24px}
  h1{margin:0 0 4px;font-size:18px} input,button{font:inherit;height:40px;border-radius:4px;border:1px solid #29303a;padding:0 10px}
  input{background:#0f1216;color:#e6e9ee} button{background:#5b9df0;border-color:#5b9df0;color:#fff;font-weight:600;cursor:pointer}
  .err{color:#f07167;font-size:14px;margin:0}
</style></head><body>
<form method="post" action="/__login">
  <h1>SmartLogBook</h1>
  ${error ? '<p class="err">סיסמה שגויה</p>' : ''}
  <input type="password" name="password" placeholder="סיסמה" autocomplete="current-password" autofocus required>
  <button type="submit">כניסה</button>
</form></body></html>`, { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export default async function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return new Response('Site locked: SITE_PASSWORD is not configured.', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  const expected = await token(password);
  const url = new URL(request.url);

  if (url.pathname === '/__login' && request.method === 'POST') {
    const form = await request.formData();
    const given = String(form.get('password') || '');
    if (!sameString(await token(given), expected)) return loginPage(true);
    return new Response(null, {
      status: 303,
      headers: {
        location: '/',
        'set-cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        'cache-control': 'no-store',
      },
    });
  }

  const cookie = cookieValue(request, COOKIE);
  if (cookie && sameString(cookie, expected)) return next();

  if (url.pathname.startsWith('/api/')) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  return loginPage(false);
}
