// Short-lived signed token from the app (ADR-031). The app (Vercel) and the
// Worker share TRACKER_SECRET; the app mints `v1.<expEpochSec>.<sig>` after
// checking the user's session, the Worker verifies it. No user data inside.
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

export async function signToken(secret, expSec) {
  return `v1.${expSec}.${await hmac(secret, `v1.${expSec}`)}`;
}

export async function verifyToken(secret, token, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret || secret.length < 32 || typeof token !== 'string') return false;
  const [v, exp, sig] = token.split('.');
  if (v !== 'v1' || !/^\d+$/.test(exp) || !sig) return false;
  if (Number(exp) < nowSec || Number(exp) > nowSec + 3600) return false;   // expired, or unreasonably long-lived
  const expected = await hmac(secret, `v1.${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
