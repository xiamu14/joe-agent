import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'joe-usage-test-'));
process.env.JOE_DATA_DIR = directory;
process.env.OPENROUTER_API_TOKEN = 'test-key';
process.env.ELEVENLABS_API_KEY = 'voice-key';
const { store } = await import('../src/joe/store');
const { trackGeneration, syncUsage } = await import('../src/joe/usage-sync');

test('reconciliation sums tool steps once, preserves dates, retries delayed data and never invents zeros', async () => {
  const original = fetch;
  store.usage('turn', 'llm', 'test/model', null, null, null);
  const time = store.db.prepare('SELECT time FROM usage WHERE id=?').get('turn')!.time;
  trackGeneration('turn', { response: { id: 'gen-one' } });
  trackGeneration('turn', { response: { id: 'gen-one' } });
  trackGeneration('turn', { response: { id: 'gen-two' } });
  let delayed = true,
    calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-key');
    const id = new URL(String(url)).searchParams.get('id');
    if (id === 'gen-two' && delayed) return new Response('', { status: 404 });
    return Response.json({
      data: { id, native_tokens_prompt: 10, native_tokens_completion: 3, total_cost: 0.125 },
    });
  };
  try {
    await Promise.all([syncUsage(), syncUsage()]);
    assert.equal(calls, 2);
    assert.equal(store.summary('UTC').model.known, 0);
    assert.equal(store.summary('UTC').tokensPending, 1);
    await syncUsage();
    assert.equal(calls, 2);
    delayed = false;
    store.db.prepare('UPDATE usage_lookup SET checked_at=0 WHERE complete=0').run();
    await syncUsage();
    const summary = store.summary('UTC');
    assert.equal(summary.input, 20);
    assert.equal(summary.output, 6);
    assert.equal(summary.model.known, 0.25);
    assert.equal(summary.model.pending, 0);
    assert.equal(summary.tokensPending, 0);
    assert.equal(store.db.prepare('SELECT time FROM usage WHERE id=?').get('turn')!.time, time);
    await syncUsage();
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test('legacy known tokens can use published price estimates; unknown tokens remain unknown', async () => {
  const original = fetch;
  store.usage('legacy', 'llm', 'test/model', 100, 20, null);
  store.usage('unknown', 'llm', 'test/model', null, null, null, 'error');
  globalThis.fetch = async (url) => {
    assert.equal(String(url), 'https://openrouter.ai/api/v1/models');
    return Response.json({ data: [{ id: 'test/model', pricing: { prompt: '0.001', completion: '0.002' } }] });
  };
  try {
    await syncUsage();
    assert.equal(store.db.prepare('SELECT cost FROM usage WHERE id=?').get('legacy')!.cost, 0.14);
    assert.equal(store.db.prepare('SELECT cost FROM usage WHERE id=?').get('unknown')!.cost, null);
  } finally {
    globalThis.fetch = original;
  }
});

test('malformed and unauthorized lookups retain existing measurements', async () => {
  const original = fetch;
  store.usage('bad', 'llm', 'test/model', 9, 2, 0.01);
  trackGeneration('bad', { response: { id: 'gen-bad' } });
  globalThis.fetch = async () =>
    Response.json({ data: { id: 'gen-bad', native_tokens_prompt: -10, total_cost: -1 } });
  try {
    await syncUsage();
    assert.equal(store.db.prepare('SELECT cost FROM usage WHERE id=?').get('bad')!.cost, 0.01);
    store.db.prepare('UPDATE usage_lookup SET checked_at=0 WHERE complete=0').run();
    globalThis.fetch = async () => new Response('', { status: 401 });
    await syncUsage();
    assert.equal(store.db.prepare('SELECT input FROM usage WHERE id=?').get('bad')!.input, 9);
  } finally {
    globalThis.fetch = original;
  }
});
test.after(() => {
  store.db.close();
  rmSync(directory, { recursive: true, force: true });
});
