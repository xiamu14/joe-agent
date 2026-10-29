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
