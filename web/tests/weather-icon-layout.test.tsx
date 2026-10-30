import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeatherIcon } from '../src/joe/weather/weather-icon';
import { weatherIconBounds } from '../src/joe/weather/weather-icon-bounds';

test('weather art aligns above its transparent ground shadow at both sizes without clipping it', () => {
  for (const enlarged of [false, true]) {
    const html = renderToStaticMarkup(<WeatherIcon icon="cloudy" label="阴天" enlarged={enlarged} />);
    assert.match(html, /aspect-ratio:134 \/ 71/);
    assert.match(html, enlarged ? /w-42/ : /w-28/);
    assert.match(html, /alt="阴天"/);
    assert.doesNotMatch(html, /overflow-hidden/);
  }
});

test('every weather asset has an optical baseline within its source viewBox', () => {
  const directory = new URL('../public/weather/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.svg'))) {
    const svg = readFileSync(new URL(file, directory), 'utf8');
    const [, width, height] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
    const bounds = weatherIconBounds[file.replace('.svg', '')];
    assert.ok(bounds, file);
    assert.equal(bounds[0], Number(width), file);
    assert.ok(bounds[1] > 0 && bounds[1] <= Number(height) + 0.1, file);
  }
});
