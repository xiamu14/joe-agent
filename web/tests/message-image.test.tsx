import { test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MessagePrompt } from '../src/joe/composer/message-prompt';
import { Faq } from '../src/components/rare-ui/faq';
import type { Message } from '../src/joe/types';
import { AttachmentList } from '../src/components/rare-ui/attachment-list';

test('sent tally uses plain Chinese copy and an accessible image preview outside a nested button', () => {
  const message = { command: 'tally', text: '/tally ', sessionId: 'session', attachments: [{ id: 'image', name: 'bank.png', mime: 'image/png' }] } as Message;
  const html = renderToStaticMarkup(<Faq items={[{ id: 'turn', question: message.text, questionContent: <MessagePrompt message={message} />, answer: '已记账' }]} />);
  expect(html).toContain('记账');
  expect(html).not.toContain('/tally');
  expect(html).not.toContain('data-shortcut');
  expect(html).toContain('aria-label="预览bank.png"');
  expect(html).toContain('max-h-[150cqw]');
  expect(html).toContain('object-top');
  expect(html).not.toMatch(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/);
});

test('composer attachments use cropped squares, a 2.5-image scroll strip, and compact remove controls', () => {
  const html = renderToStaticMarkup(<AttachmentList files={[1, 2, 3].map(id => ({ id: String(id), name: `bank-${id}.png`, mime: 'image/png' }))} sessionId="session" disabled={false} onRemove={() => {}} />);
  expect(html).toContain('max-w-[113px]');
  expect(html).toContain('overflow-x-auto');
  expect(html).toContain('object-cover object-top');
  expect(html).not.toContain('object-none');
  expect(html).toContain('rounded-full');
  expect(html).toContain('size-[34px]');
  expect(html).toContain('-right-1.5 -top-1.5');
  expect(html).toContain('bg-[#444444]');
  expect(html).toContain('py-2 pl-1 pr-2');
  expect(html).not.toMatch(/>bank-\d\.png</);
  expect((html.match(/aria-label="预览bank-/g) ?? []).length).toBe(3);
  expect((html.match(/aria-label="移除bank-/g) ?? []).length).toBe(3);
});
