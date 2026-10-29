import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownAnswer, hasMarkdown } from '../src/joe/markdown-answer';
import type { Message } from '../src/joe/types';

const message = { text: '**重点**', speechText: '重点', visibleText: '重', status: 'complete' } as Message;
test('plays speech captions before showing formatted Markdown', () => {
  assert.equal(hasMarkdown('普通文本'), false);
  assert.equal(hasMarkdown(message.text), true);
  const playing = renderToStaticMarkup(<MarkdownAnswer message={message} voicePending />);
  assert.match(playing, /重/);
  assert.doesNotMatch(playing, /<strong/);
  const done = renderToStaticMarkup(<MarkdownAnswer message={message} voicePending={false} />);
  assert.match(done, /data-streamdown="strong">重点/);
  const plain = renderToStaticMarkup(<MarkdownAnswer message={{ ...message, text: '普通文本', speechText: '朗读', visibleText: '朗' }} voicePending />);
  assert.match(plain, /朗/);
});

test('does not render raw HTML or unsafe links', () => {
  const unsafe = { ...message, text: '**安全** <img src=x onerror="alert(1)"> [bad](javascript:alert(1))', visibleText: undefined, speechText: undefined };
  const output = renderToStaticMarkup(<MarkdownAnswer message={unsafe} voicePending={false} />);
  assert.doesNotMatch(output, /<img|onerror=|href="javascript:/i);
});
