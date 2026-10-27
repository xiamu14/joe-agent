import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
const ignored = new Set(['node_modules', '.git', '.mastra', '.tanstack', 'dist', 'data', '.output', '.build', 'build', '.swiftpm']);
const violations = [];
let count = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(?:[cm]?[jt]sx?|css|html|swift)$/.test(entry.name)) {
      count++;
      const source = await readFile(path, 'utf8');
      const lines = source.split('\n').length - Number(source.endsWith('\n'));
      if (lines > 500) violations.push(`${path}: ${lines} lines`);
    }
  }
}
await walk(new URL('..', import.meta.url).pathname);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else console.log(`${count} source files checked: all ≤ 500 lines.`);
