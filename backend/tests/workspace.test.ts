import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWorkspace, openCard, closeCard, swapCards, type CardId } from '../../web/src/joe/workspace-state';
import { answerSchema, settingsSchema } from '../src/joe/schema';

test('default cards, swapping and replacement preserve the conversation', () => {
  assert.deepEqual(initialWorkspace, { primary: 'conversation', ordinary: 'costs', conversation: true });
  const costs = swapCards(initialWorkspace);
  assert.equal(costs.primary, 'costs');
  const settings = openCard(costs, 'settings');
  assert.equal(settings.ordinary, 'settings');
  assert.equal(settings.conversation, true);
  assert.equal(swapCards(settings).primary, 'conversation');
  assert.deepEqual(closeCard(settings, 'settings'), { primary: 'conversation', ordinary: null, conversation: true });
});

test('primary conversation cannot close and closing the last ordinary card restores it', () => {
  assert.equal(closeCard(initialWorkspace, 'conversation'), initialWorkspace);
  const single = closeCard(openCard(initialWorkspace, 'settings'), 'conversation');
  assert.equal(single.conversation, false);
  assert.deepEqual(closeCard(single, 'settings'), { primary: 'conversation', ordinary: null, conversation: true });
  assert.equal(swapCards(single), single);
});

test('all card actions preserve one ordinary card and a visible primary', () => {
  const cards: CardId[] = ['conversation', 'costs', 'settings'];
  let states = [initialWorkspace];
  for (let depth = 0; depth < 3; depth++) {
    states = states.flatMap(state => [swapCards(state), ...cards.flatMap(card => [openCard(state, card), closeCard(state, card)])]);
    for (const state of states) {
      assert.ok(state.conversation || state.ordinary);
      assert.ok(state.primary === 'conversation' ? state.conversation : state.primary === state.ordinary);
    }
  }
});

test('default input mute is backwards compatible and card requests are bounded', () => {
  assert.equal(settingsSchema.parse({ voice: true }).defaultMuted, false);
  assert.equal(settingsSchema.parse({ defaultMuted: true }).defaultMuted, true);
  assert.throws(() => settingsSchema.parse({ defaultMuted: 'true' }));
  const answer = { expression: { emotion: 'calm', intensity: 0.3 }, text: 'Here is the information.' };
  assert.equal(answerSchema.parse(answer).card, undefined);
  assert.equal(answerSchema.parse({ ...answer, card: 'costs' }).card, 'costs');
  assert.throws(() => answerSchema.parse({ ...answer, card: 'time' }));
  assert.throws(() => answerSchema.parse({ ...answer, card: 'video' }));
  assert.throws(() => answerSchema.parse({ ...answer, card: 'background' }));
});
