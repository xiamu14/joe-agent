import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real widget and history hooks with a deterministic effect scheduler.
function fixture(initialHistory = []) {
  const slots = [], effects = [], storage = new Map();
  storage.set('youtube-widget:recent:v1', JSON.stringify(initialHistory));
  let cursor = 0, dirty = false, tree, player, nextId = 0;
  const scene = { selection: { id: 'video', expanded: true }, open() {} };
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } }) },
    motion: new Proxy({}, { get: (_, key) => key }),
    AnimatePresence: 'AnimatePresence', ChevronDown: 'ChevronDown', Button: 'Button', TiltCard: 'TiltCard', VideoList: 'VideoList', VideoBackdrop: 'VideoBackdrop',
    videoId: 'BagZ55ac4xs', videoUrl: '', nanoid: () => String(++nextId),
    useCanvasScene: () => scene, useIsPresent: () => true,
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous[i]))) effects.push(effect);
      slots[index] = deps;
    },
    useYouTubePlayer(expanded, selected, active, tracking, onStarted) {
      player = { expanded, selected, active, onStarted };
      return { ready: true, pause() {}, play() {} };
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  });
  for (const name of ['use-video-history.ts', 'youtube-card.tsx']) {
    const source = readFileSync(new URL(`../src/joe/video/${name}`, import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/\bexport /g, '');
    vm.runInContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }), context);
  }
  function render(props) {
    do {
      dirty = false; cursor = 0;
      tree = context.YouTubeCard(props);
      effects.splice(0).forEach(effect => effect());
    } while (dirty);
    return tree;
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    const children = [node.props?.children].flat(Infinity);
    return [node, ...children.flatMap(child => nodes(child))];
  }
  return { render, nodes: () => [...nodes(tree.props.expandedActions), ...nodes(tree.props.children(true))], get player() { return player; }, get history() { return JSON.parse(storage.get('youtube-widget:recent:v1') ?? '[]'); } };
}
const first = { id: 'jNQXAC9IVRw', title: 'Search result', channel: '', thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg' };
const direct = { ...first, id: 'XWdrTHssIUQ', title: 'Direct video', thumbnail: 'https://i.ytimg.com/vi/XWdrTHssIUQ/hqdefault.jpg' };

test('direct playback preserves search results and enters recent only after actual playback', () => {
  const f = fixture();
  const results = { query: 'original search', videos: [first] };
  f.render({ results });
  const request = { requestId: 'request-1', video: direct };
  const consumed = [];
  const props = { results, playback: request, onPlaybackHandled: id => consumed.push(id) };
  f.render(props);
  assert.equal(f.player.selected, direct.id);
  assert.equal(f.player.expanded, true);
  assert.deepEqual(f.history, []);
  assert.deepEqual(consumed, ['request-1']);
  f.render(props);
  assert.deepEqual(consumed, ['request-1']);
  f.player.onStarted();
  f.render({ results });
  assert.equal(f.history[0].id, direct.id);
  const back = f.nodes().find(node => node.type === 'Button' && node.props.children === '返回列表');
  back.props.onClick({ stopPropagation() {} });
  f.render({ results });
  f.nodes().find(node => node.props['aria-label'] === '展开最近播放').props.onClick({ stopPropagation() {} });
  f.render({ results });
  const lists = f.nodes().filter(node => node.type === 'VideoList');
  assert.equal(lists[0].props.items[0].id, direct.id);
  assert.equal(lists[1].props.items, results.videos);
  // List playback shares the same recording path and deduplicates history.
  lists[1].props.onSelect(first);
  f.render({ results });
  assert.equal(f.history.length, 1);
  f.player.onStarted();
  f.player.onStarted();
  f.render({ results });
  assert.deepEqual(f.history.map(item => item.id), [first.id, direct.id]);
});

test('switching away from a playing video never records the new target before it starts', () => {
  const f = fixture();
  const results = { query: 'search', videos: [first] };
  f.render({ results, playback: { requestId: 'one', video: first } });
  f.player.onStarted();
  f.render({ results, playback: { requestId: 'two', video: direct } });
  assert.equal(f.player.selected, direct.id);
  assert.deepEqual(f.history.map(item => item.id), [first.id]);
});

test('legacy history is trimmed to ten and recording keeps ten unique videos', () => {
  const history = Array.from({ length: 20 }, (_, index) => {
    const id = String(index).padStart(11, '0');
    return { ...first, id, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  });
  const f = fixture(history);
  f.render({});
  assert.equal(f.history.length, 10);
  f.nodes().find(node => node.props['aria-label'] === '展开最近播放').props.onClick({ stopPropagation() {} });
  f.render({});
  assert.equal(f.nodes().find(node => node.type === 'VideoList').props.items.length, 10);
  f.render({ playback: { requestId: 'new', video: direct } });
  f.player.onStarted();
  f.render({});
  assert.equal(f.history.length, 10);
  assert.equal(f.history[0].id, direct.id);
  assert.equal(f.history[9].id, history[8].id);
});

test('recent grid hides all videos when collapsed and toggles without hiding search results', () => {
  const f = fixture([first, direct]);
  const results = { query: 'search', videos: [first] };
  f.render({ results });
  const getGrid = () => f.nodes().find(node => node.type === 'VideoList' && node.props.layout === 'grid');
  assert.equal(getGrid(), undefined);
  const toggle = () => f.nodes().find(node => node.props['aria-label']?.endsWith('最近播放') && node.type === 'Button');
  assert.equal(toggle().props['aria-expanded'], false);
  assert.match(toggle().props.className, /gap-1/);
  assert.doesNotMatch(toggle().props.className, /justify-between/);
  const searchTitle = f.nodes().find(node => node.type === 'p' && node.props.children?.[0] === '搜索结果');
  assert.equal(searchTitle.props.children[1].props.children, 1);
  toggle().props.onClick({ stopPropagation() {} });
  f.render({ results });
  assert.equal(getGrid().props.items.length, 2);
  assert.equal(toggle().props['aria-expanded'], true);
  assert.equal(f.nodes().find(node => node.type === 'VideoList' && !node.props.layout).props.items, results.videos);
  toggle().props.onClick({ stopPropagation() {} });
  f.render({ results });
  assert.equal(getGrid(), undefined);
});
