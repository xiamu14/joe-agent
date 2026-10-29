import test from 'node:test';
import assert from 'node:assert/strict';
import { weather } from '../src/joe/weather';

test('weather expires after fifteen minutes and capacity eviction retains other fresh locations', async t => {
  const key = process.env.WEATHER_API_KEY;
  process.env.WEATHER_API_KEY = 'fixture';
  t.after(() => { if (key === undefined) delete process.env.WEATHER_API_KEY; else process.env.WEATHER_API_KEY = key; });
  let now = performance.now(), calls = 0;
  t.mock.method(performance, 'now', () => now);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({
      location: { name: 'City', region: '', country: '', tz_id: 'UTC' },
      current: { temp_c: calls, feelslike_c: 20, humidity: 50, wind_kph: 10,
        condition: { text: '晴', code: 1000 }, is_day: 1, last_updated_epoch: 100 },
      forecast: { forecastday: [{ date: '2026-10-29', day: { mintemp_c: 10 }, astro: { sunrise: '06:00 AM', sunset: '06:00 PM' } }] },
    });
  });
  const first = await weather('expiry-city');
  now += 15 * 60_000 - 1;
  t.mock.timers.tick(15 * 60_000 - 1);
  assert.deepEqual(await weather('expiry-city'), first);
  now += 2;
  t.mock.timers.tick(2);
  assert.notEqual((await weather('expiry-city')).temperature, first.temperature);
  for (let i = 0; i < 31; i++) {
    now += 1;
    t.mock.timers.tick(1);
    await weather(`capacity-${i}`);
  }
  const count = calls;
  await weather('capacity-29');
  assert.equal(calls, count, 'capacity eviction must not clear every cached city');
  await weather('capacity-0');
  assert.equal(calls, count + 1, 'oldest expiry should be evicted');
});
