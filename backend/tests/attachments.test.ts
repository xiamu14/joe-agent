import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'account-attachments-'));
process.env.JOE_DATA_DIR = directory;
const { Store, store } = await import('../src/joe/store');
const { attachFile } = await import('../src/joe/attachments');

test('image attachments validate bytes, enforce session ownership, and preserve legacy text', async () => {
  const db = new Store(':memory:');
  try {
    const session = db.session(), other = db.session();
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lfoAAAAASUVORK5CYII=', 'base64');
    const image = await attachFile(db, session, new File([bytes], 'bank.png', { type: 'image/png' }));
    assert.equal(image.mime, 'image/png');
    assert.deepEqual(db.image(session, image.id)?.bytes, bytes);
    assert.equal(db.image(other, image.id), undefined);
    assert.throws(() => db.attachment(other, image.id));
    const text = await attachFile(db, session, new File(['旧文本'], 'notes.txt'));
    assert.equal(db.attachment(session, text.id).text, '旧文本');
    await assert.rejects(attachFile(db, session, new File(['not an image'], 'fake.png', { type: 'image/png' })));
    await assert.rejects(attachFile(db, session, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png')));
    db.deleteAttachment(session, image.id);
    assert.equal(db.image(session, image.id), undefined);
  } finally { db.db.close(); }
});
test.after(() => { store.db.close(); rmSync(directory, { recursive: true, force: true }); });
