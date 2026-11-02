import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('starting video cancels speech without cancelling the chat and reveals its text before releasing widgets', () => {
  const calls = [], refs = [], states = [];
  const react = {
    useRef: initial => { const ref = { current: initial }; refs.push(ref); return ref; },
    useState: initial => {
      const state = { value: initial };
      states.push(state);
      return [initial, value => { state.value = typeof value === 'function' ? value(state.value) : value; }];
    },
    useCallback: callback => callback,
    useEffect() {},
  };
  const modules = {
    react,
    './composer/use-attachments': { useAttachments: () => ({ attachments: [], uploading: false }) },
    './text-stream': { TextStream: class {} },
    'motion/react': { useMotionValue: value => ({ get: () => value }) },
    './widget-display-gate': { createWidgetDisplayGate: () => ({ release: () => calls.push('release') }) },
  };
  const exports = {};
  const named = {};
  const source = readFileSync(new URL('../src/joe/use-joe.ts', import.meta.url), 'utf8')
    .replace(/\b(voice|abort|speechAbort) = useRef<[^;\n]+?>\(null\)/g, (_, name) => `${name} = namedRef('${name}')`);
  const context = vm.createContext({ exports, require: name => modules[name] ?? {}, AbortController,
    namedRef: name => named[name] = { current: null },
  });
  vm.runInContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), context);
  const joe = exports.useJoe();
  named.abort.current = { abort: () => calls.push('cancel-chat') };
  named.voice.current = { stop: () => calls.push('stop-audio') };
  named.speechAbort.current = { abort: () => calls.push('cancel-speech') };
  const messages = states.find(state => state.value === joe.messages);
  messages.value = [{ text: '完整回答', visibleText: '完整' }];
  joe.stopSpeech();
  assert.deepEqual(calls, ['cancel-speech', 'stop-audio', 'release']);
  assert.equal(messages.value[0].visibleText, undefined);
  assert.equal(messages.value[0].text, '完整回答');
});
