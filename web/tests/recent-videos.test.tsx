import { test, expect } from 'bun:test';
import { readRecentVideos } from '../src/joe/video/use-video-history';

test('chat and video card read the latest same bounded browser history', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const video = { id: 'XWdrTHssIUQ', title: 'OpenDots review', channel: 'Audio', thumbnail: 'https://i.ytimg.com/vi/XWdrTHssIUQ/hqdefault.jpg' };
  let saved = JSON.stringify([video]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } } });
  try {
    expect(readRecentVideos()[0].title).toBe(video.title);
    saved = JSON.stringify([{ ...video, title: 'Newer playback' }]);
    expect(readRecentVideos()[0].title).toBe('Newer playback');
    saved = JSON.stringify([{ ...video, id: 'invalid' }, ...Array(11).fill(video)]);
    expect(readRecentVideos()).toHaveLength(10);
    saved = 'invalid JSON';
    expect(readRecentVideos()).toEqual([]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
