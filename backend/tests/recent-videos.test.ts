import test from 'node:test';
import assert from 'node:assert/strict';
import { recentVideoMatches, recentVideosSchema } from '../src/joe/recent-videos';
import { chatSchema } from '../src/joe/schema';
import { nanoid } from 'nanoid';

const first = { id: 'XWdrTHssIUQ', title: 'OpenDots Run 100% Review', channel: 'Audio Channel' };
const second = { id: 'jNQXAC9IVRw', title: 'OpenDots comparison', channel: 'Other Channel' };
test('recent videos match title fragments, channels, and combined constraints after normalization', () => {
  assert.equal(recentVideoMatches('ｏｐｅｎｄｏｔｓ  run', undefined, [first])[0]?.id, first.id);
  assert.equal(recentVideoMatches(' AUDIO   CHANNEL ', undefined, [first, second])[0]?.id, first.id);
  assert.equal(recentVideoMatches('OpenDots', 'audio', [first, second])[0]?.id, first.id);
  assert.equal(recentVideoMatches('OpenDots', undefined, [first, second]).length, 2);
  assert.equal(recentVideoMatches('OpenDots', undefined, [first, first]).length, 1);
  assert.equal(recentVideoMatches('missing', undefined, [first]).length, 0);
  assert.equal(recentVideoMatches(' ', undefined, [first]).length, 0);
  assert.equal(recentVideoMatches('OpenDots', undefined, [first])[0].thumbnail, `https://i.ytimg.com/vi/${first.id}/hqdefault.jpg`);
});
test('the OpenDots playback phrase matches the actual punctuated recent title', () => {
  const video = { id: 'SFoUryIjsIs', title: 'OpenDots: Run 100% Free Self-Hosted AI Coworkers Locally (OpenAI Dots Open Source)', channel: 'AI Vibe Coder' };
  const another = { id: 'jNQXAC9IVRw', title: 'OpenDots: Set it up free in 8 minutes', channel: 'Other Channel' };
  assert.equal(recentVideoMatches('opendots run 100% free', undefined, [video, another])[0]?.id, video.id);
  assert.equal(recentVideoMatches('OpenDots：Run 100% Free', 'AI-Vibe Coder', [video, another])[0]?.id, video.id);
  assert.equal(recentVideoMatches('Self Hosted AI', undefined, [video])[0]?.id, video.id);
  assert.equal(recentVideoMatches('OpenDots', undefined, [video, another]).length, 2);
  assert.equal(recentVideoMatches('!!!', undefined, [video]).length, 0);
});
test('chat accepts bounded recent context and preserves clients without it', () => {
  const input = { sessionId: nanoid(), turnId: nanoid(), text: '播放 OpenDots', model: 'test' };
  assert.deepEqual(chatSchema.parse(input).recentVideos, []);
  assert.deepEqual(chatSchema.parse({ ...input, recentVideos: [first] }).recentVideos, [first]);
  assert.throws(() => recentVideosSchema.parse(Array(11).fill(first)));
  assert.throws(() => recentVideosSchema.parse([{ ...first, id: 'invalid' }]));
  assert.throws(() => recentVideosSchema.parse([{ ...first, title: 'a'.repeat(301) }]));
});
