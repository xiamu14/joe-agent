import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { dataDirectory } from '../src/joe/data-directory';
test('data path stays outside public regardless of Mastra working directory', () => {
  const root = process.cwd();
  for (const cwd of [root, resolve(root, 'src/mastra/public'), resolve(root, '.mastra/output')]) {
    assert.equal(dataDirectory(cwd, './data'), resolve(root, 'data'));
  }
  assert.throws(() => dataDirectory(root, './src/mastra/public/data'), /public/);
  assert.equal(dataDirectory(root, '/tmp/joe-test-storage'), '/tmp/joe-test-storage');
});
