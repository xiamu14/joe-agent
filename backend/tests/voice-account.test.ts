import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceAccounts, VOICE_ACCOUNT_POLL_MS } from '../src/joe/voice-account';

test('polls one subscription for both capabilities, caches and converts invoice cents', async (t) => {
  const original = fetch,
    env = { ...process.env };
  let now = 100000,
    calls = 0;
  t.mock.method(Date, 'now', () => now);
  process.env.JOE_ASR_PROVIDER = process.env.JOE_TTS_PROVIDER = 'elevenlabs';
  process.env.ELEVENLABS_API_KEY = 'account-test';
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(String(url), 'https://api.elevenlabs.io/v1/user/subscription');
    assert.equal(new Headers(options?.headers).get('xi-api-key'), 'account-test');
    return Response.json({
      tier: 'creator',
      character_count: 1200,
      character_limit: 100000,
      currency: 'usd',
      next_invoice: { amount_due_cents: 2200 },
      next_character_count_reset_unix: 1234,
      email: 'must-not-return',
      secret: 'must-not-return',
    });
  };
  try {
    const [a, b] = await Promise.all([voiceAccounts(), voiceAccounts()]);
    assert.deepEqual(a, b);
    assert.equal(calls, 1);
    assert.equal(a.accounts[0].nextInvoice, 22);
    assert.equal(a.accounts[0].used, 1200);
    assert.equal(a.accounts[0].resetAt, 1234000);
    assert.doesNotMatch(JSON.stringify(a), /must-not-return|account-test/);
    now += VOICE_ACCOUNT_POLL_MS;
    await voiceAccounts();
    assert.equal(calls, 2);
    now += VOICE_ACCOUNT_POLL_MS;
    globalThis.fetch = async () => new Response('private error', { status: 403 });
    const denied = await voiceAccounts();
    assert.match(denied.accounts[0].error!, /权限/);
    assert.equal(denied.accounts[0].nextInvoice, undefined);
  } finally {
    globalThis.fetch = original;
    process.env = env;
  }
});

test('Fish wallet preserves decimal balance and missing invoices are not zero', async () => {
  const original = fetch,
    env = { ...process.env };
  process.env.JOE_ASR_PROVIDER = 'fish';
  process.env.JOE_TTS_PROVIDER = 'elevenlabs';
  process.env.FISH_API_TOKEN = 'fish-account';
  process.env.ELEVENLABS_API_KEY = 'second-account';
  globalThis.fetch = async (url) =>
    String(url).includes('fish.audio')
      ? Response.json({ credit: '12.3456789' })
      : Response.json({ tier: 'free', character_count: 0, character_limit: 10000 });
  try {
    const { accounts } = await voiceAccounts();
    assert.equal(accounts[0].balance, '12.3456789');
    assert.equal(accounts[0].currency, 'usd');
    assert.equal(accounts[1].nextInvoice, null);
    assert.equal(accounts[1].currency, null);
  } finally {
    globalThis.fetch = original;
    process.env = env;
  }
});

test('PAYG credits convert to USD with the actual top-up rate and invalidate cached rates', async () => {
  const original = fetch, env = { ...process.env };
  process.env.JOE_ASR_PROVIDER = process.env.JOE_TTS_PROVIDER = 'elevenlabs';
  process.env.ELEVENLABS_API_KEY = 'payg-account';
  delete process.env.ELEVENLABS_USD_PER_1000_CREDITS;
  let used = 186;
  globalThis.fetch = async () => Response.json({
    tier: 'payg', character_count: used, character_limit: 23736,
    currency: 'usd', next_invoice: null,
  });
  try {
    let account = (await voiceAccounts()).accounts[0];
    assert.equal(account.nextInvoice, null);
    assert.equal(account.remainingCredits, 23550);
    assert.equal(account.balance, undefined);
    process.env.ELEVENLABS_USD_PER_1000_CREDITS = '0.364';
    account = (await voiceAccounts()).accounts[0];
    assert.equal(Number(account.balance).toFixed(4), '8.5722');
    process.env.ELEVENLABS_USD_PER_1000_CREDITS = '0.3';
    account = (await voiceAccounts()).accounts[0];
    assert.equal(Number(account.balance), 7.065);
    used = 24000;
    process.env.ELEVENLABS_USD_PER_1000_CREDITS = '0.4';
    account = (await voiceAccounts()).accounts[0];
    assert.equal(account.balance, '0');
    for (const rate of ['-1', '0', 'NaN', 'Infinity', '1e309', 'invalid']) {
      process.env.ELEVENLABS_USD_PER_1000_CREDITS = rate;
      account = (await voiceAccounts()).accounts[0];
      assert.match(account.error!, /费率/);
      assert.equal(account.balance, undefined);
    }
  } finally {
    globalThis.fetch = original;
    process.env = env;
  }
});

test('invalid Fish wallet amounts do not become dollar balances', async () => {
  const original = fetch, env = { ...process.env };
  process.env.JOE_ASR_PROVIDER = process.env.JOE_TTS_PROVIDER = 'fish';
  try {
    for (const credit of ['NaN', '-1', '9'.repeat(400)]) {
      process.env.FISH_API_TOKEN = `invalid-wallet-${credit}`;
      globalThis.fetch = async () => Response.json({ credit });
      const account = (await voiceAccounts()).accounts[0];
      assert.ok(account.error);
      assert.equal(account.balance, undefined);
    }
  } finally {
    globalThis.fetch = original;
    process.env = env;
  }
});
