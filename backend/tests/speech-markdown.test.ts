import test from 'node:test';
import assert from 'node:assert/strict';
import { speechMarkdown } from '../src/joe/speech-markdown';

test('converts Markdown to speakable text while preserving ordinary text', () => {
  assert.equal(speechMarkdown('你好，world!\n下一行。'), '你好，world!\n下一行。');
  const result = speechMarkdown('# 标题\n\n**重要** [说明](https://example.com)\n\n- 第一项\n- 第二项\n\n```js\nsecret_code()\n```');
  assert.match(result, /标题/);
  assert.match(result, /重要 说明/);
  assert.match(result, /第一项[\s\S]*第二项/);
  assert.match(result, /以下是代码/);
  assert.doesNotMatch(result, /https:|\*\*|secret_code/);
});
