import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForBackend } from './wait-for-backend.mjs';
test('startup waits through connection refusal and ignores unrelated health responses', async () => {
  const original = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1) throw new TypeError('ECONNREFUSED');
    return Response.json(attempts === 2 ? { ready: true } : { service: 'joe-backend', ready: true });
  };
  try {
    await waitForBackend({ timeout: 2000 });
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = original;
  }
});
test('cancelled startup never waits for another service', async () => {
  await assert.rejects(waitForBackend({ signal: AbortSignal.abort() }), { name: 'AbortError' });
});
test('readiness has a bounded timeout', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 503 });
  try {
    await assert.rejects(waitForBackend({ timeout: 10 }), /未就绪/);
  } finally {
    globalThis.fetch = original;
  }
});
