import { test, expect } from 'bun:test';
import { applyResourceSnapshot } from '../src/joe/widget-resource-state';

test('resources ignore duplicate and out-of-order versions', () => {
  const latest = applyResourceSnapshot({}, { resourceId: 'r', schema: 'weather@1', revision: 2, data: { place: 'Tokyo' } });
  expect(applyResourceSnapshot(latest, { resourceId: 'r', schema: 'weather@1', revision: 1, data: { place: 'Osaka' } })).toBe(latest);
  expect((latest.r.data as { place: string }).place).toBe('Tokyo');
});
