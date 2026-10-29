import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture() {
  let options, expanded = true, readyPlayer, blocked = 0, playing = false, error = '', previousCalls = 0;
  const scripts = [], timers = new Map(), calls = { paused: 0, destroyed: 0, created: 0, cleared: 0 };
  const iframe = {};
  const player = { playVideo() {}, pauseVideo() { calls.paused++; }, destroy() { calls.destroyed++; }, getIframe: () => iframe };
  const api = { Player: class { constructor(_, value) { calls.created++; options = value; return player; } } };
  const host = { append() {}, replaceChildren() { calls.cleared++; } };
  const window = { location: { origin: 'http://localhost:5173' }, onYouTubeIframeAPIReady: () => previousCalls++ };
  const context = vm.createContext({
    Promise, Error, window,
    document: { createElement: () => ({ remove() { this.removed = true; } }), head: { append: script => scripts.push(script) } },
    setTimeout: (callback, delay) => { timers.set(callback, delay); return callback; },
    clearTimeout: callback => timers.delete(callback),
  });
  for (const file of ['youtube-api.ts', 'mount-youtube-player.ts']) {
    const source = readFileSync(new URL(`../src/joe/video/${file}`, import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/\bexport /g, '');
    vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), context);
  }
  return {
    context, window, scripts, timers, calls, iframe, player,
    get options() { return options; }, get readyPlayer() { return readyPlayer; }, get playing() { return playing; }, get error() { return error; }, get blocked() { return blocked; }, get previousCalls() { return previousCalls; },
    resolve() { window.YT = api; window.onYouTubeIframeAPIReady(); },
    collapse() { expanded = false; },
    mount() { return context.mountYouTubePlayer(host, { isExpanded: () => expanded, onReady: p => { readyPlayer = p; }, onPlaying: value => { playing = value; }, onError: value => { error = value; }, onPlaybackStarted() {}, onAutoplayBlocked: () => blocked++ }); },
  };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('concurrent players share one official API script and preserve the previous ready callback', async () => {
  const f = fixture();
  const first = f.context.loadYouTubeApi(), second = f.context.loadYouTubeApi();
  assert.equal(first, second);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, 'https://www.youtube.com/iframe_api');
  f.resolve();
  await first;
  assert.equal(f.previousCalls, 1);
  assert.equal(f.timers.size, 0);
});

test('a failed API request can retry instead of caching a rejected promise', async () => {
  const f = fixture();
  const first = f.context.loadYouTubeApi();
  f.scripts[0].onerror();
  await assert.rejects(first, /脚本加载失败/);
  const second = f.context.loadYouTubeApi();
  assert.equal(f.scripts.length, 2);
  f.resolve();
  await second;
});

test('player embeds the requested video with explicit origin and reports actual playback state', async () => {
  const f = fixture(), dispose = f.mount();
  f.resolve(); await flush();
  assert.equal(f.options.videoId, 'BagZ55ac4xs');
  assert.equal(f.options.playerVars.origin, 'http://localhost:5173');
  assert.equal(f.options.playerVars.playsinline, 1);
  assert.ok(f.iframe.allow.includes('autoplay'));
  f.options.events.onReady({ target: f.player });
  assert.equal(f.readyPlayer, f.player);
  f.options.events.onStateChange({ target: f.player, data: 1 });
  assert.equal(f.playing, true);
  f.options.events.onStateChange({ target: f.player, data: 2 });
  assert.equal(f.playing, false);
  f.options.events.onAutoplayBlocked();
  assert.equal(f.blocked, 1);
  f.options.events.onError({ target: f.player, data: 150 });
  assert.match(f.error, /禁止嵌入/);
  dispose();
  assert.equal(f.calls.destroyed, 1);
  assert.equal(f.calls.cleared, 1);
  assert.equal(f.timers.size, 0);
});

test('late playback after minimization pauses the existing player without destroying its progress', async () => {
  const f = fixture(), dispose = f.mount();
  f.resolve(); await flush();
  f.collapse();
  f.options.events.onStateChange({ target: f.player, data: 1 });
  assert.equal(f.calls.paused, 1);
  assert.equal(f.calls.destroyed, 0);
  assert.equal(f.playing, false);
  dispose();
});

test('unmount before API readiness never creates a late player', async () => {
  const f = fixture(), dispose = f.mount();
  dispose(); f.resolve(); await flush();
  assert.equal(f.calls.created, 0);
  assert.equal(f.timers.size, 0);
});

test('native embed survives control script failure and is only removed on disposal', async () => {
  const f = fixture(), dispose = f.mount();
  f.scripts[0].onerror();
  await flush(); await flush();
  assert.match(f.error, /控制脚本加载失败/);
  assert.equal(f.calls.cleared, 0);
  assert.equal(f.calls.destroyed, 0);
  dispose();
  assert.equal(f.calls.cleared, 1);
});
