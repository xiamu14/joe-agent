import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nanoid } from 'nanoid';

const directory = mkdtempSync(join(tmpdir(), 'account-tally-'));
process.env.JOE_DATA_DIR = directory;
process.env.OPENROUTER_API_TOKEN = 'test-placeholder';
await import('../src/mastra/index');
const { store } = await import('../src/joe/store');
const { chat } = await import('../src/joe/chat');
const { widgetStore } = await import('../src/joe/widget-runtime');
const { financeStore } = await import('../src/joe/tally');
const { conversationMessages } = await import('../src/joe/conversations');
const { mastraStorage } = await import('../src/joe/memory');
const { readEvents } = await import('../../web/src/joe/stream');

test('tally sends images to the OCR model, persists balances, and emits finance widget snapshots', async () => {
  const original = globalThis.fetch;
  const sessionId = store.session();
  const attachment = store.attach(sessionId, 'bank.png', '', { mime: 'image/png', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lfoAAAAASUVORK5CYII=', 'base64') });
  const output = { accounts: [{ attachmentId: attachment.id, bank: '平安银行', last4: null, label: '平安银行信用卡1', accountType: 'credit', currency: 'CNY', balance: 1234.56, rawBalance: '1,234.56', observedAt: null }], questions: [] as string[] };
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('data:')) return original(url, init);
    assert.equal(String(url), 'https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'openai/gpt-5-nano');
    assert.match(JSON.stringify(body.messages), /data:image\/png;base64,/);
    assert.match(JSON.stringify(body.messages), new RegExp(attachment.id));
    assert.match(JSON.stringify(body.messages), /User notes: \/tally 平安银行信用卡1/);
    calls++;
    return Response.json({ id: `gen-tally-${calls}`, object: 'chat.completion', created: 1, model: body.model,
      choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(output) }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } });
  };
  const send = async () => {
    const events: any[] = [];
    const response = await chat({ sessionId, turnId: nanoid(), text: '/tally 平安银行信用卡1', command: 'tally', model: 'openai/gpt-6-luna', attachmentIds: [attachment.id] }, new AbortController().signal);
    await readEvents(response, event => events.push(event));
    const completed = events.find(event => event.type === 'message.completed');
    assert.equal(completed?.message.status, 'complete', JSON.stringify(events));
    return events;
  };
  try {
    const first = await send();
    const resource = first.find(event => event.type === 'resource.snapshot').resource;
    assert.equal(resource.schema, 'finance.accounts@1');
    assert.equal(resource.data.accounts[0].records[0].balanceMinor, -123456);
    assert.equal(resource.data.accounts[0].last4, null);
    assert.equal(resource.data.accounts[0].label, '平安银行信用卡1');
    assert.equal(first.find(event => event.type === 'widget.snapshot').instance.widgetType, 'builtin.finance');
    assert.match(first.find(event => event.type === 'message.completed').message.text, /已记录 1/);
    assert.equal(first.some(event => event.type === 'card.open'), false, 'the stack stays collapsed');
    const again = await send();
    assert.match(again.find(event => event.type === 'message.completed').message.text, /未重复添加/);
    const canvas = widgetStore.canvasForSession(sessionId);
    assert.equal(financeStore.snapshot(canvas).accounts[0].records.length, 1);
    assert.equal(widgetStore.snapshot(canvas).resources[0].data.accounts[0].records.length, 1);
    const history = await conversationMessages(sessionId);
    assert.equal(history[0].command, 'tally');
    assert.equal(history[0].attachments[0].mime, 'image/png');
    output.questions.push('请确认尾号');
    const unclear = await send();
    assert.match(unclear.find(event => event.type === 'message.completed').message.text, /暂未记账/);
    assert.equal(unclear.some(event => event.type === 'widget.snapshot'), false);
    assert.equal(financeStore.snapshot(canvas).accounts[0].records.length, 1);
    assert.equal(calls, 3);
  } finally { globalThis.fetch = original; }
});
test.after(async () => { await mastraStorage.close(); store.db.close(); rmSync(directory, { recursive: true, force: true }); });
