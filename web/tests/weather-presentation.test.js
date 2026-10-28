import test from 'node:test';
import assert from 'node:assert/strict';
import { localWeatherTime, weatherKind, weatherPresentation } from '../src/joe/weather/presentation.ts';
const base = { configured: true, timezone: 'Asia/Shanghai', forecastDate: '2026-10-28', sunrise: '06:00 AM', sunset: '06:00 PM', isDay: true, conditionCode: 1000 };

test('uses the weather location date and daylight instead of device time or stale day flags', () => {
  assert.deepEqual(localWeatherTime(Date.parse('2026-10-27T18:00:00Z'), 'Asia/Shanghai'), { date: '2026-10-28', minutes: 120 });
  assert.equal(weatherPresentation(base, Date.parse('2026-10-28T04:00:00Z')).icon, 'clear-day');
  const night = weatherPresentation(base, Date.parse('2026-10-28T14:00:00Z'));
  assert.equal(night.icon, 'clear-night');
  assert.equal(night.theme, 'night');
});

test('weather codes choose original SVG files and appropriate palette families', () => {
  const now = Date.parse('2026-10-28T04:00:00Z');
  assert.equal(weatherPresentation({ ...base, conditionCode: 1003 }, now).icon, 'partly-cloudy-day');
  assert.equal(weatherPresentation({ ...base, conditionCode: 1009 }, now).theme, 'cloudy');
  assert.equal(weatherPresentation({ ...base, conditionCode: 1153 }, now).theme, 'rain');
  assert.equal(weatherKind(1276), 'thunder');
  assert.equal(weatherKind(1225), 'snow');
  assert.equal(weatherKind(1135), 'fog');
  assert.equal(weatherKind(9999), 'unknown');
});

test('sunrise/sunset themes apply only on the matching forecast date', () => {
  assert.equal(weatherPresentation(base, Date.parse('2026-10-28T09:40:00Z')).theme, 'twilight');
  const stale = weatherPresentation(base, Date.parse('2026-10-29T09:40:00Z'));
  assert.equal(stale.today, false);
  assert.notEqual(stale.theme, 'twilight');
});

test('night rain keeps its rain icon and uses the night background', () => {
  const value = weatherPresentation({ ...base, conditionCode: 1153 }, Date.parse('2026-10-28T14:00:00Z'));
  assert.equal(value.kind, 'rain');
  assert.equal(value.theme, 'night');
  assert.equal(value.icon, 'drizzle');
});
