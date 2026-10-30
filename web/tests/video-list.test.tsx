import { test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoList } from '../src/components/rare-ui/video-list';
const video = { id: 'jNQXAC9IVRw', title: 'Example', channel: 'Channel', thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg' };
test('video list formats duration and omits missing metadata', () => {
  const render = (duration?: number) => renderToStaticMarkup(<VideoList items={[{ ...video, duration }]} onSelect={() => {}} />);
  expect(render(3661)).toContain('1:01:01');
  expect(render(125)).toContain('2:05');
  expect(render()).not.toContain('0:00');
  expect(render()).not.toContain('次观看');
});

test('recent grid uses image-first tiles and keeps full titles accessible', () => {
  const items = Array.from({ length: 10 }, (_, index) => ({ ...video, id: String(index), title: `Video ${index}`, duration: 125 }));
  const markup = renderToStaticMarkup(<VideoList layout="grid" items={items} onSelect={() => {}} />);
  expect(markup).toContain('grid-cols-3');
  expect(markup).toContain('@min-[560px]:grid-cols-4');
  expect(markup).not.toContain('line-clamp-2');
  expect(markup).toContain('whitespace-nowrap truncate');
  expect(markup).toContain('gap-x-2 gap-y-1');
  expect(markup).toContain('title="Video 0"');
  expect(markup).toContain('2:05');
  expect(markup.match(/<button/g)).toHaveLength(10);
});
