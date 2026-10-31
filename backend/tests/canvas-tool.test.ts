import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestContext } from '@mastra/core/request-context';
import { editCanvasTool } from '../src/joe/canvas-tool';

test('object-shaped tool input preserves apply validation before executing changes', async () => {
  const requestContext = new RequestContext();
  const calls: unknown[] = [];
  requestContext.set('canvas.edit', (input: unknown) => { calls.push(input); return { status: 'applied' }; });
  for (const input of [
    { mode: 'apply' },
    { mode: 'apply', changes: [] },
    { mode: 'apply', changes: [{ type: 'canvas.rename', name: '' }] },
    { mode: 'apply', changes: [{ type: 'widget.visibility', widgetType: 'youtube.video' }] },
  ]) {
    const result = await editCanvasTool.execute!(input as never, { requestContext } as never);
    assert.equal(result.error, true);
  }
  assert.deepEqual(calls, []);
  for (const input of [
    { mode: 'inspect' },
    { mode: 'apply', changes: [{ type: 'canvas.rename', name: '娱乐间' }, { type: 'widget.retain', selector: { widgetType: 'youtube.video' } }] },
    { mode: 'apply', target: { name: '娱乐间' }, changes: [{ type: 'widget.visibility', widgetType: 'builtin.weather', visible: false }] },
  ]) {
    const result = await editCanvasTool.execute!(input as never, { requestContext } as never);
    assert.equal(result.status, 'applied');
    assert.deepEqual(calls.at(-1), input);
  }
});
