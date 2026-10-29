import test from 'node:test';
import assert from 'node:assert/strict';
import { currentWeather, weather } from '../src/joe/weather';
import { getWeather } from '../src/joe/weather-tool';
import { RequestContext } from '@mastra/core/request-context';
const fixture = {
  location: { name: 'Shenzhen', region: 'Guangdong', country: 'China', tz_id: 'Asia/Shanghai' },
  current: {
    temp_c: 25,
    feelslike_c: 27,
    humidity: 65,
    wind_kph: 12,
    condition: { text: '多云', code: 1003 },
    is_day: 1,
    last_updated_epoch: 1792700000,
  },
  forecast: { forecastday: [{ date: '2026-10-28', day: { mintemp_c: 20 }, astro: { sunrise: '06:20 AM', sunset: '05:45 PM' } }] },
};
test('IP weather and city tool share WeatherAPI, cache results and hide credentials', async () => {
  const original = fetch,
    key = process.env.WEATHER_API_KEY;
  process.env.WEATHER_API_KEY = 'secret-key';
  const queries: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.weatherapi.com');
    assert.equal(url.pathname, '/v1/forecast.json');
    assert.equal(url.searchParams.get('key'), 'secret-key');
    assert.equal(url.searchParams.get('days'), '1');
    queries.push(url.searchParams.get('q')!);
    return Response.json(fixture);
  };
  try {
    const result = await currentWeather('8.8.8.8');
    assert.equal(result.temperature, 25);
    assert.equal(result.condition, '多云');
    assert.equal(result.minimum, 20);
    assert.equal(result.isDay, true);
    assert.equal(result.conditionCode, 1003);
    assert.equal(result.sunset, '05:45 PM');
    assert.equal(result.forecastDate, '2026-10-28');
    assert.equal(result.place, 'Shenzhen · Guangdong · China');
    assert.equal(result.timezone, 'Asia/Shanghai');
    assert.equal(result.updatedAt, 1792700000000);
    assert.doesNotMatch(JSON.stringify(result), /secret-key/);
    assert.deepEqual(await currentWeather('8.8.8.8'), result);
    const requestContext = new RequestContext();
    requestContext.set('client.ip', '8.8.4.4');
    const local = await getWeather.execute!({}, { requestContext } as never);
    assert.equal(local.place, 'Shenzhen · Guangdong · China');
    const toolResult = await getWeather.execute!({ city: '东京，日本 & test' }, {} as never);
    assert.equal(toolResult.temperature, 25);
    assert.deepEqual(queries, ['8.8.8.8', '8.8.4.4', '东京，日本 & test']);
    await assert.rejects(currentWeather('8.8.8.8', AbortSignal.abort()), { name: 'AbortError' });
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = key;
  }
});
test('configuration, bad city, quota, malformed response and network failure are handled safely', async () => {
  const original = fetch,
    key = process.env.WEATHER_API_KEY;
  try {
    delete process.env.WEATHER_API_KEY;
    globalThis.fetch = async () => assert.fail('must not call without key');
    assert.deepEqual(await currentWeather('8.8.8.8'), { configured: false });
    process.env.WEATHER_API_KEY = 'test';
    for (const [code, message] of [
      [1006, /未找到地点/],
      [2007, /额度/],
      [2006, /API Key/],
    ] as const) {
      globalThis.fetch = async () =>
        Response.json({ error: { code, message: 'private details' } }, { status: 400 });
      await assert.rejects(weather('invalid-location'), message);
    }
    globalThis.fetch = async () => Response.json({ current: { temp_c: 'bad' } });
    await assert.rejects(weather('invalid-location'), /天气查询失败/);
    globalThis.fetch = async () => {
      throw new Error('https://api.weatherapi.com?key=secret');
    };
    await assert.rejects(weather('invalid-location'), /^Error: 天气查询失败，请稍后重试$/);
    await assert.rejects(weather(' '));
    await assert.rejects(currentWeather(undefined), /指定城市/);
    await assert.rejects(currentWeather('not-an-ip'), /指定城市/);
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = key;
  }
});
