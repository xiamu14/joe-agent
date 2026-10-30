import test from 'node:test';
import assert from 'node:assert/strict';
import { providerBilling } from '../src/joe/provider-billing';

const now = Date.UTC(2026, 9, 30, 1, 36);
function setup(t: Parameters<Parameters<typeof test>[1]>[0], name: string) {
  const env = { ...process.env };
  process.env.JOE_TTS_PROVIDER = 'elevenlabs';
  process.env.ELEVENLABS_API_KEY = `${name}-voice`;
  process.env.OPENROUTER_API_TOKEN = `${name}-model`;
  t.after(() => { process.env = env; });
}
function voiceResponse(cost: number, unit = 'usd') {
  // Column order is defined by the provider response, not a fixed offset.
  return Response.json({ columns: ['timestamp', 'total_cost', 'product_type'],
    column_units: [null, unit, null], rows: [['2026-10-30T00:00:00Z', cost, 'TTS']] });
}

test('reads supplier USD aggregates, filters TTS, shares concurrent queries and resets at UTC midnight', async t => {
  setup(t, 'aggregate');
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    calls.push(url);
    if (url.includes('openrouter')) return Response.json({ data: { usage: 12.345, usage_daily: 0.125 } });
    const body = JSON.parse(String(options.body));
    assert.equal(body.time_zone, 'UTC');
    assert.deepEqual(body.filters, [{ column: 'product_type', operation: 'eq', values: ['TTS'] }]);
    assert.equal(body.end_time, calls.length > 3 ? Date.UTC(2026, 9, 31) : now);
    assert.ok(body.interval_seconds >= 86400);
    const lifetime = body.start_time === Date.UTC(2020, 0, 1);
    if (!lifetime) assert.equal(body.start_time % 86400000, 0);
    return voiceResponse(lifetime ? 4.2 : 0.03);
  });
  const [a, b] = await Promise.all([providerBilling(now), providerBilling(now)]);
  assert.deepEqual(a, b);
  assert.equal(calls.length, 3);
  assert.equal(a.model.today, 0.125);
  assert.equal(a.model.lifetime, 12.345);
  assert.equal(a.voice.today, 0.03);
  assert.equal(a.voice.lifetime, 4.2);
  assert.equal(a.total.today, 0.155);
  assert.ok(Math.abs(a.total.lifetime! - 16.545) < 1e-10);
  assert.equal(a.currency, 'USD');
  assert.doesNotMatch(JSON.stringify(a), /aggregate-model|aggregate-voice/);
  await providerBilling(now + 1000);
  assert.equal(calls.length, 3);
  await providerBilling(Date.UTC(2026, 9, 31));
  assert.equal(calls.length, 6);
});

test('missing fields, invalid currency and denied access never turn into zero-dollar bills', async t => {
  setup(t, 'invalid');
  t.mock.method(globalThis, 'fetch', async (url: string) => url.includes('openrouter')
    ? Response.json({ data: { usage: 99 } }) : voiceResponse(4, 'credits'));
  const bill = await providerBilling(now);
  assert.equal(bill.model.today, null);
  assert.equal(bill.voice.lifetime, null);
  assert.equal(bill.total.today, null);
  assert.ok(bill.model.error);
  assert.ok(bill.voice.error);
  process.env.OPENROUTER_API_TOKEN = 'denied';
  process.env.ELEVENLABS_API_KEY = 'denied';
  t.mock.method(globalThis, 'fetch', async () => new Response('private-provider-error', { status: 403 }));
  const denied = await providerBilling(now);
  assert.equal(denied.total.lifetime, null);
  assert.doesNotMatch(JSON.stringify(denied), /private-provider-error|denied/);
});

test('empty provider usage is a measured zero; partial failures do not show a partial total', async t => {
  setup(t, 'empty');
  t.mock.method(globalThis, 'fetch', async (url: string) => url.includes('openrouter')
    ? Response.json({ data: { usage: 0, usage_daily: 0 } })
    : Response.json({ columns: ['total_cost', 'product_type'], column_units: ['usd', null], rows: [] }));
  const empty = await providerBilling(now);
  assert.equal(empty.total.today, 0);
  assert.equal(empty.total.lifetime, 0);
  process.env.ELEVENLABS_API_KEY = 'failed-voice';
  t.mock.method(globalThis, 'fetch', async (url: string) => url.includes('openrouter')
    ? Response.json({ data: { usage: 12, usage_daily: 3 } }) : new Response('', { status: 500 }));
  const partial = await providerBilling(now);
  assert.equal(partial.model.today, 3);
  assert.equal(partial.total.today, null);
});
