import type { Store } from './store';

export const imageLimit = 5 * 1024 * 1024;
export function imageMime(bytes: Uint8Array) {
  const data = Buffer.from(bytes);
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return undefined;
}

export async function attachFile(store: Store, session: string, file: File) {
  store.requireSession(session);
  if (!file.size || file.size > imageLimit) throw new Error('图片限 5MB，文本限 1MB');
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = imageMime(bytes);
  const name = file.name.slice(0, 180);
  if (mime) return store.attach(session, name, '', { mime, bytes });
  if (!/\.(md|txt)$/i.test(name) || file.size > 1024 * 1024) throw new Error('支持 JPG、PNG、WebP、MD 和 TXT');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('请上传 UTF-8 文本文件'); }
  if (text.includes('\0') || text.length > 60000) throw new Error('文件包含二进制内容或超过 60,000 字符');
  return store.attach(session, name, text);
}
