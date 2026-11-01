import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('attachment requests serialize and late results cannot enter a replacement session', async () => {
  const effects = [], states = [], refs = [], errors = [], pending = [];
  let slot = 0, ref = 0;
  const context = vm.createContext({
    FormData, AbortController,
    useState: initial => { const index = slot++; states[index] ??= initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useRef: value => refs[ref++] ?? (refs[ref - 1] = { current: value }),
    useEffect: effect => effects.push(effect),
    api: (path, options) => new Promise(resolve => pending.push({ path, options, resolve })),
    jsonBody: value => value,
  });
  const source = readFileSync(new URL('../src/joe/composer/use-attachments.ts', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/\bexport /g, '');
  vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), context);
  const hook = context.useAttachments('first', false, value => errors.push(value));
  const cleanup = effects[0]();
  const file = new File(['a'], 'bank.png', { type: 'image/png' });
  const upload = hook.upload(file);
  await hook.upload(file);
  assert.equal(pending.length, 1);
  assert.equal(states[1], true);
  hook.cancelUpload();
  pending[0].resolve({ id: 'late', name: 'bank.png' });
  await upload;
  assert.equal(states[0].length, 0);
  assert.equal(states[1], false);
  const next = hook.upload(file);
  pending[1].resolve({ id: 'fresh', name: 'bank.png' });
  await next;
  assert.equal(states[0][0].id, 'fresh');
  const remove = hook.removeAttachment('fresh');
  cleanup();
  slot = 0; ref = 0;
  context.useAttachments('second', false, value => errors.push(value));
  effects[1]();
  pending[2].resolve({ ok: true });
  await remove;
  assert.equal(states[0].length, 0);
  assert.deepEqual(errors.filter(Boolean), []);
});
