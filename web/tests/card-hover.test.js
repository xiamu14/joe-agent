import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardHoverIntent } from '../src/joe/card-hover-intent.ts';

function setup(context) {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const events = [];
  const hover = createCardHoverIntent(id => events.push(['lift', id]), id => events.push(['front', id]));
  return { hover, events, tick: ms => context.mock.timers.tick(ms) };
}

test('hover confirms intent, lifts before promotion, and cancels on leave', context => {
  const { hover, events, tick } = setup(context);
  hover.move('idea', { x: 1, y: 1 });
  tick(99); hover.leave('idea'); tick(200);
  assert.ok(!events.some(([type]) => type === 'front'));
  hover.move('idea', { x: 2, y: 1 });
  tick(100);
  assert.deepEqual(events.at(-1), ['lift', 'idea']);
  tick(79);
  assert.ok(!events.some(([type]) => type === 'front'));
  tick(1);
  assert.deepEqual(events.at(-1), ['front', 'idea']);
});

test('crossing overlapping cards cancels every earlier pending promotion', context => {
  const { hover, events, tick } = setup(context);
  hover.move('idea', { x: 1, y: 1 }); tick(100);
  hover.move('video', { x: 2, y: 1 }); tick(50);
  hover.move('tasks', { x: 3, y: 1 });
  hover.leave('video'); // A late leave event cannot cancel the current card.
  tick(100); tick(80);
  assert.deepEqual(events.filter(([type]) => type === 'front'), [['front', 'tasks']]);
});

test('a stationary pointer cannot start a chain when stacking changes its hit target', context => {
  const { hover, events, tick } = setup(context);
  hover.move('idea', { x: 10, y: 10 }); tick(100); tick(80);
  hover.leave('idea');
  hover.move('video', { x: 10, y: 10 }); tick(200);
  assert.deepEqual(events.filter(([type]) => type === 'front'), [['front', 'idea']]);
  hover.move('video', { x: 11, y: 10 }); tick(100);
  hover.cancel(); tick(80);
  assert.deepEqual(events.filter(([type]) => type === 'front'), [['front', 'idea']]);
});
