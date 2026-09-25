import 'server-only';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Single-user password check (ADR-031). The hash lives in APP_PASSWORD_HASH,
// produced by `node scripts/hash-password.mjs`, so the plain password never
// touches the repo, the logs, or the assistant.
// Format: scrypt:N:r:p:<salt b64>:<hash b64>
// (':' not '$' — Next's .env loader expands $VAR, which silently mangles the hash.)
//
// scrypt (node:crypto) rather than argon2/bcrypt: same memory-hard KDF class,
// no native build step on Vercel.

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export async function verifyPassword(given: string): Promise<boolean> {
  const stored = process.env.APP_PASSWORD_HASH;
  if (!stored || !given) return false;
  const [algo, n, r, p, saltB64, hashB64] = stored.split(':');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(given, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
