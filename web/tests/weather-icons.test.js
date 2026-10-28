import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { weatherIconName } from '../src/joe/weather/presentation.ts';

test('weather intensity, mixed precipitation and day/night choose matching SVGs', () => {
  const icon = (conditionCode, day = true, extra = {}) => weatherIconName({ configured: true, conditionCode, ...extra }, day);
  assert.equal(icon(1000), 'clear-day');
  assert.equal(icon(1000, false), 'clear-night');
  assert.equal(icon(1003, false), 'partly-cloudy-night');
  assert.equal(icon(1153), 'drizzle');
  assert.equal(icon(1186), 'rain');
  assert.equal(icon(1195), 'heavy-rain');
  assert.equal(icon(1243), 'showers');
  assert.equal(icon(1204), 'ice-pellets');
  assert.equal(icon(1213), 'light-snow');
  assert.equal(icon(1225), 'snow');
  assert.equal(icon(1273), 'thunder-showers');
  assert.equal(icon(1276), 'thunder-rain');
  assert.equal(icon(1279), 'thunder');
  assert.equal(icon(1135), 'fog');
  assert.equal(icon(1000, true, { windKph: 30 }), 'wind-day');
  assert.equal(icon(1000, false, { windKph: 30 }), 'wind-night');
  assert.equal(icon(1000, true, { temperature: 35 }), 'hot');
  assert.equal(icon(1000, false, { temperature: 35 }), 'clear-night');
  assert.equal(icon(9999), 'cloudy');
});

test('every condition resolves to a non-empty local SVG without remote image dependencies', () => {
  const codes = [1000,1003,1006,1009,1030,1063,1066,1069,1072,1087,1114,1117,1135,1147,1150,1153,1168,1171,1180,1183,1186,1189,1192,1195,1198,1201,1204,1207,1210,1213,1216,1219,1222,1225,1237,1240,1243,1246,1249,1252,1255,1258,1261,1264,1273,1276,1279,1282];
  for (const conditionCode of codes) for (const day of [false, true]) {
    const name = weatherIconName({ configured: true, conditionCode }, day);
    const path = new URL(`../public/weather/${name}.svg`, import.meta.url);
    const svg = readFileSync(path, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.ok(svg.length > 100);
    assert.doesNotMatch(svg, /(?:href|src)=["']https?:/);
  }
  assert.equal(existsSync(new URL('../public/weather/icons.png', import.meta.url)), false);
});
