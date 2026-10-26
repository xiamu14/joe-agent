import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { visualState } from '../src/state.js';

const source = readFileSync(new URL('../src/orb.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export function', 'function');

function mount(pixelRatio = 3) {
  const calls = { renders: 0, sizes: 0, disposed: [], observerDisconnected: false };
  const events = new Map(), canvasEvents = new Map();
  let renderer, resize, now = 0, scene;
  class Renderer {
    constructor(options) { renderer = this; this.domElement = canvas; this.options = options; }
    setClearColor(color, alpha) { this.clearAlpha = alpha; }
    render(value) { scene = value; calls.renders++; }
    setPixelRatio(value) { this.ratio = value; }
    setSize(width, height, updateStyle) { calls.sizes++; assert.equal(updateStyle, false); }
    setAnimationLoop(callback) { this.loop = callback; }
    dispose() { calls.disposed.push('renderer'); }
  }
  const canvas = {
    addEventListener: (key, fn) => canvasEvents.set(key, fn),
    removeEventListener: key => canvasEvents.delete(key),
  };
  const document = {
    hidden: false,
    addEventListener: (key, fn) => events.set(key, fn),
    removeEventListener: key => events.delete(key),
  };
  const context = vm.createContext({
    THREE: { ...THREE, WebGLRenderer: Renderer },
    vertexShader: '', fragmentShader: '', document, devicePixelRatio: pixelRatio,
    matchMedia: () => ({ matches: false }), performance: { now: () => now },
    ResizeObserver: class {
      constructor(fn) { resize = fn; }
      observe() {}
      disconnect() { calls.observerDisconnected = true; }
    },
  });
  vm.runInContext(source, context);
  const orb = context.createOrb({ getBoundingClientRect: () => ({ width: 224, height: 174 }) }, visualState(), canvas, () => {});
  return { orb, renderer, calls, document, events, canvasEvents, resize,
    scene, tick(value) { now = value; renderer.loop?.(value); } };
}

test('fluid orbs use one quad and budget pixel ratio and render rate', () => {
  const m = mount();
  assert.equal(m.scene.children[0].geometry.attributes.position.count, 4);
  assert.equal(m.renderer.ratio, 2);
  for (let i = 1; i <= 120; i++) m.tick(i * 1000 / 120);
  assert.ok(m.calls.renders >= 25 && m.calls.renders <= 31);
  m.resize(); m.resize();
  assert.equal(m.calls.sizes, 1);
  m.orb.dispose();
});

test('hidden and paused orbs stop their loop and resume only when both allow it', () => {
  const m = mount();
  m.document.hidden = true;
  m.events.get('visibilitychange')();
  assert.equal(m.renderer.loop, null);
  const renders = m.calls.renders;
  m.orb.pause(true);
  m.document.hidden = false;
  m.events.get('visibilitychange')();
  assert.equal(m.renderer.loop, null);
  assert.equal(m.calls.renders, renders);
  m.orb.pause(false);
  assert.equal(typeof m.renderer.loop, 'function');
  m.canvasEvents.get('webglcontextlost')({ preventDefault() {} });
  assert.equal(m.renderer.loop, null);
  m.orb.pause(false);
  assert.equal(m.renderer.loop, null);
  m.orb.dispose();
});

test('unmount frees geometry, renderer and listeners once', () => {
  const m = mount();
  let resources = 0;
  for (const child of m.scene.children) {
    child.geometry.addEventListener('dispose', () => resources++);
    child.material.addEventListener('dispose', () => resources++);
  }
  m.orb.dispose(); m.orb.dispose();
  assert.equal(resources, 2);
  assert.deepEqual(m.calls.disposed, ['renderer']);
  assert.equal(m.renderer.loop, null);
  assert.equal(m.events.size, 0);
  assert.equal(m.canvasEvents.size, 0);
  assert.equal(m.calls.observerDisconnected, true);
});

test('fluid orbs render directly on a transparent canvas without an opaque background', () => {
  const m = mount();
  assert.equal(m.renderer.options.alpha, true);
  assert.equal(m.renderer.clearAlpha, 0);
  assert.equal(m.scene.background, null);
  assert.equal(m.scene.children[0].material.transparent, true);
  m.orb.dispose();
});

 test('paused orbs still update fault colors without restarting animation', () => {
  const m = mount();
  m.orb.pause(true);
  const renders = m.calls.renders;
  m.orb.update(visualState('error'));
  assert.equal(m.renderer.loop, null);
  assert.equal(m.calls.renders, renders + 1);
  const color = m.scene.children[0].material.uniforms.u_color.value;
  assert.ok(color.equals(new THREE.Color('#FF3B30').convertLinearToSRGB()));
  m.orb.dispose();
});

test('retina orbs retain native resolution up to the rendering budget', () => {
  for (const ratio of [1, 1.5, 2, 3]) {
    const m = mount(ratio);
    assert.equal(m.renderer.ratio, Math.min(ratio, 2));
    m.orb.dispose();
  }
});
