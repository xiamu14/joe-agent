import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResource } from '../src/joe/widget-resources';
const video = { id: 'jNQXAC9IVRw', title: 'Video', channel: '', thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg' };
test('video resources preserve optional metadata and accept historical results', () => {
  const old = validateResource('youtube.search@1', { query: 'test', videos: [video] });
  assert.equal(old.videos.length, 1);
  const current = validateResource('youtube.search@1', { query: 'test', videos: [{ ...video, publishedAt: '2026-10-29', views: 0 }] });
  assert.equal(current.videos[0].views, 0);
  assert.equal(current.videos[0].publishedAt, '2026-10-29');
  assert.throws(() => validateResource('youtube.search@1', { query: 'test', videos: [{ ...video, views: -1 }] }));
});
