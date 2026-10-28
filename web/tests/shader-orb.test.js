import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function mount(reduced = false) {
  let now = 0, nextFrame = 0, paints = 0;
  const frames = new Map(), uniforms = new Map(), observers = [], released = [];
  const canvas = { clientWidth: 280, clientHeight: 280, width: 0, height: 0 };
  const calls = { draws: 0, fragments: '' };
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, BLEND: 8, ONE: 9, ONE_MINUS_SRC_ALPHA: 10, COLOR_BUFFER_BIT: 11, TRIANGLES: 12,
    isContextLost: () => false, createShader: type => ({ type }),
    shaderSource: (shader, source) => { if (shader.type === 2) calls.fragments = source; },
    compileShader() {}, getShaderParameter: () => true,
    createProgram: () => ({}), attachShader() {}, linkProgram() {}, getProgramParameter: () => true, useProgram() {},
    createBuffer: () => ({}), bindBuffer() {}, bufferData() {}, getAttribLocation: () => 0,
    enableVertexAttribArray() {}, vertexAttribPointer() {}, enable() {}, blendFunc() {},
    getUniformLocation: (_, name) => name, viewport() {},
    uniform1f: (name, value) => uniforms.set(name, value),
    uniform2f: (name, ...value) => uniforms.set(name, value),
    uniform3f: (name, ...value) => uniforms.set(name, value),
    clearColor() {}, clear() {}, drawArrays: () => calls.draws++,
    deleteShader: () => released.push('shader'), deleteProgram: () => released.push('program'), deleteBuffer: () => released.push('buffer'),
  };
  const context = vm.createContext({
    console, performance: { now: () => now },
    window: { devicePixelRatio: 3, matchMedia: () => ({ matches: reduced }) },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id), queueMicrotask: callback => callback(),
    ResizeObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
    IntersectionObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } },
  });
  for (const file of ['orb-state.ts', 'shader-program.ts', 'dispersion-shader.ts', 'shdr-01.tsx', 'render-generation.ts']) {
    let source = readFileSync(new URL(`../src/components/shader-orb/${file}`, import.meta.url), 'utf8');
    if (file === 'shdr-01.tsx') source = source.slice(0, source.indexOf('export type Shdr01Props'));
    source = source.replace(/^import .*$/gm, '').replace(/\bexport /g, '');
    vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), context);
  }
  const variant = vm.runInContext('shdr01Orb', context);
  const refs = Object.fromEntries(['paramsRef', 'colorsRef', 'statePresetsRef', 'stateColorsRef', 'stateVolumesRef', 'volumesRef'].map(key => [key, { current: undefined }]));
  refs.stateRef = { current: 'idle' };
  refs.pausedRef = { current: false };
  const dispose = context.createRenderGeneration(canvas, gl, variant, true, 1.5, refs, () => paints++);
  return {
    canvas, calls, uniforms, observers, released, frames, refs, dispose, variant,
    get paints() { return paints; },
    tick() { now += 20; const [id, callback] = [...frames][0]; frames.delete(id); callback(); },
  };
}

test('SHDR-01 draws its actual shader and idle preset at a bounded DPR', () => {
  const m = mount();
  assert.equal(m.variant.key, 'shdr-01');
  assert.equal(m.calls.draws, 1);
  assert.equal(m.paints, 1);
  assert.equal(m.canvas.width, 420);
  assert.equal(m.canvas.height, 420);
  assert.equal(m.uniforms.get('uP_turb'), 0.3);
  assert.equal(m.uniforms.get('uP_exposure'), 60);
  assert.ok(m.calls.fragments.includes('#define STEPS 60'));
  m.dispose();
});

test('offscreen and paused orbs skip drawing; disposal releases all GL resources', () => {
  const m = mount();
  m.tick();
  assert.equal(m.calls.draws, 1);
  m.observers[1].callback([{ isIntersecting: true }]);
  m.tick();
  assert.equal(m.calls.draws, 2);
  m.refs.pausedRef.current = true;
  m.tick();
  assert.equal(m.calls.draws, 2);
  m.dispose();
  assert.equal(m.frames.size, 0);
  assert.ok(m.observers.every(observer => observer.disconnected));
  assert.deepEqual(m.released.sort(), ['buffer', 'program', 'shader', 'shader']);
});

test('reduced motion paints a single frame and never starts an animation loop', () => {
  const m = mount(true);
  assert.equal(m.calls.draws, 1);
  assert.equal(m.frames.size, 0);
  m.dispose();
});
