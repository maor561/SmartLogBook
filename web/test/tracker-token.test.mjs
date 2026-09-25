// The app (node:crypto) and the Worker (WebCrypto) must agree on the token.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyToken, signToken } from '../../tracker/src/auth.js';

test('app-minted token verifies in the Worker, and vice versa', async () => {
  const secret = 'k'.repeat(48), now = 1_800_000_000, exp = now + 600;
  const appToken = `v1.${exp}.${createHmac('sha256', secret).update(`v1.${exp}`).digest('base64url')}`;
  assert.equal(await verifyToken(secret, appToken, now), true);
  assert.equal(appToken, await signToken(secret, exp));
});
