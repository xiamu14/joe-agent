import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';

export function dataDirectory(cwd = process.cwd(), configured = process.env.JOE_DATA_DIR) {
  let root = resolve(cwd);
  while (true) {
    const manifest = resolve(root, 'package.json');
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === '@joe/backend') break;
    const parent = dirname(root);
    if (parent === root) {
      if (configured && isAbsolute(configured)) break;
      throw new Error('Cannot locate Joe backend; set an absolute JOE_DATA_DIR');
    }
    root = parent;
  }
  const directory = resolve(root, configured || 'data');
  if (directory.split(sep).includes('public')) throw new Error('JOE_DATA_DIR cannot be inside public');
  return directory;
}
