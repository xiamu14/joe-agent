import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nanoid } from 'nanoid';
import { desktopActionSchema, desktopExecutor, finishDesktopAction } from '../src/joe/desktop';

test('desktop actions wait for matching client acknowledgement', async () => {
  const sessionId = nanoid(), turnId = nanoid();
  let id = '';
  const execute = desktopExecutor(sessionId, turnId, new AbortController().signal, (_, data) => { id = String(data.id); });
  const waiting = execute({ action: 'open', card: 'video' });
  const result = { sessionId, turnId, id, ok: true, detail: 'ready', state: { cards: ['video'], layout: 'stack', immersive: null, playing: false } };
  assert.throws(() => finishDesktopAction({ ...result, turnId: nanoid() }));
  finishDesktopAction(result);
  assert.equal((await waiting as { ok: boolean }).ok, true);
  assert.throws(() => finishDesktopAction(result));
});
test('cancellation releases pending desktop operations', async () => {
  const controller = new AbortController();
  const execute = desktopExecutor(nanoid(), nanoid(), controller.signal, () => {});
  const waiting = execute({ action: 'play' });
  controller.abort();
  assert.equal((await waiting as { ok: boolean }).ok, false);
});
test('desktop rejects arbitrary commands and unsafe window bounds', () => {
  assert.equal(desktopActionSchema.safeParse({ action: 'eval', script: 'hello' }).success, false);
  assert.equal(desktopActionSchema.safeParse({ action: 'resize', width: -1 }).success, false);
});
