// Creates the APP_PASSWORD_HASH value for the new app's login (ADR-031).
// Run it yourself and paste the output into Vercel → Environment Variables:
//
//   node scripts/hash-password.mjs
//
// The password is read from the terminal and never written anywhere.
import { scryptSync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const N = 16384, r = 8, p = 1, KEYLEN = 32;

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl._writeToOutput = function (s) { if (!this.muted) this.output.write(s); };
rl.question('סיסמה (לא תוצג): ', (pw) => {
  rl.close();
  process.stdout.write('\n');
  if (!pw || pw.length < 8) { console.error('לפחות 8 תווים.'); process.exit(1); }
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, KEYLEN, { N, r, p });
  console.log(`\nAPP_PASSWORD_HASH=${['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join(':')}\n`);
});
rl.muted = true;
