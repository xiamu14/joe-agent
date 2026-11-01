import { greetingMessage } from './greeting';
import { dataDirectory } from './data-directory';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { dayKey, settingsSchema, type Expression } from './schema';
import { clearLegacySessions } from './clear-legacy-sessions';
import type { ShortcutId } from '../../../shared/shortcuts';

export type Message = {
  id: string;
  sessionId: string;
  turnId: string;
  role: 'user' | 'assistant';
  text: string;
  command?: ShortcutId;
  kind?: 'greeting';
  audioUrl?: string;
  sources?: { title: string; url: string }[];
  status: string;
  error?: string;
  model: string;
  expression: Expression;
  attachments: { id: string; name: string; mime?: string }[];
  createdAt: number;
};
export class Store {
  db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id), turn TEXT NOT NULL, role TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(turn,role));
      CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, session TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL, text TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attachment_images (id TEXT PRIMARY KEY REFERENCES attachments(id) ON DELETE CASCADE,
        mime TEXT NOT NULL, bytes BLOB NOT NULL, received_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS usage (id TEXT PRIMARY KEY, time INTEGER NOT NULL, kind TEXT NOT NULL, model TEXT NOT NULL, input INTEGER, output INTEGER, cost REAL, status TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS usage_lookup (usage_id TEXT NOT NULL, provider TEXT NOT NULL, reference TEXT NOT NULL,
        input INTEGER, output INTEGER, cost REAL, units REAL, checked_at INTEGER NOT NULL DEFAULT 0,
        complete INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(provider,reference));
      CREATE TABLE IF NOT EXISTS runtime (id INTEGER PRIMARY KEY CHECK(id=1), milliseconds INTEGER NOT NULL);
      INSERT OR IGNORE INTO runtime VALUES (1,0);`);
    if (filename !== ':memory:') clearLegacySessions(this.db, resolve(dirname(filename), 'mastra.db'));
    this.db.prepare("UPDATE usage SET status='interrupted' WHERE status='pending'").run();
    // An interrupted process must not leave persisted messages marked as streaming.
    for (const row of this.db.prepare('SELECT id,data FROM messages').all()) {
      const msg = JSON.parse(String(row.data)) as Message;
      if (msg.status === 'streaming') {
        msg.status = 'interrupted';
        this.saveMessage(msg);
      }
    }
  }
  session(id?: string, greet = false) {
    if (id && this.db.prepare('SELECT id FROM sessions WHERE id=?').get(id)) {
      if (greet) this.ensureGreeting(id);
      return id;
    }
    const next = nanoid();
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(next, Date.now());
      if (greet) this.ensureGreeting(next);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return next;
  }
  ensureGreeting(sessionId: string) {
    this.requireSession(sessionId);
    const existing = this.messages(sessionId).find(message => message.kind === 'greeting');
    if (existing) return existing;
    const greeting = greetingMessage(sessionId);
    const session = this.db.prepare('SELECT created FROM sessions WHERE id=?').get(sessionId)!;
    greeting.createdAt = Number(session.created) - 1;
    this.saveMessage(greeting);
    return greeting;
  }
  requireSession(id: string) {
    if (!this.db.prepare('SELECT id FROM sessions WHERE id=?').get(id)) throw new Error('会话不存在');
  }
  messages(session: string): Message[] {
    return this.db
      .prepare('SELECT data FROM messages WHERE session=? ORDER BY rowid')
      .all(session)
      .map((r) => JSON.parse(String(r.data)));
  }
  saveMessage(msg: Message) {
    this.db
      .prepare('INSERT INTO messages VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data')
      .run(msg.id, msg.sessionId, msg.turnId, msg.role, JSON.stringify(msg));
  }
  hasTurn(turn: string) {
    return Boolean(
      this.db
        .prepare('SELECT id FROM usage WHERE id=? UNION SELECT id FROM messages WHERE turn=?')
        .get(turn, turn),
    );
  }
  settings() {
    const row = this.db.prepare('SELECT data FROM settings WHERE id=1').get();
    return settingsSchema.parse(row ? JSON.parse(String(row.data)) : {});
  }
  saveSettings(value: unknown) {
    const data = settingsSchema.parse(value);
    this.db
      .prepare('INSERT INTO settings VALUES (1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data')
      .run(JSON.stringify(data));
    return data;
  }
  attach(session: string, name: string, text: string, image?: { mime: string; bytes: Uint8Array }) {
    this.requireSession(session);
    const id = nanoid();
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO attachments VALUES (?,?,?,?)').run(id, session, name, text);
      if (image) this.db.prepare('INSERT INTO attachment_images VALUES (?,?,?,?)').run(id, image.mime, image.bytes, new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return { id, name, ...(image ? { mime: image.mime } : {}) };
  }
  attachment(session: string, id: string) {
    const row = this.db
      .prepare('SELECT id,name,text FROM attachments WHERE session=? AND id=?')
      .get(session, id);
    if (!row) throw new Error('附件不存在或不属于当前会话');
    return {
      id: String(row.id),
      name: String(row.name),
      text: String(row.text),
      image: this.image(session, id),
    };
  }
  image(session: string, id: string) {
    const row = this.db.prepare(`SELECT i.* FROM attachment_images i JOIN attachments a ON a.id=i.id WHERE a.session=? AND a.id=?`).get(session, id);
    return row ? { mime: String(row.mime), bytes: Buffer.from(row.bytes as Uint8Array), receivedAt: String(row.received_at) } : undefined;
  }
  deleteAttachment(session: string, id: string) {
    if (this.messages(session).some((m) => m.attachments.some((a) => a.id === id)))
      throw new Error('已发送的附件不能删除');
    this.db.prepare('DELETE FROM attachments WHERE session=? AND id=?').run(session, id);
  }
  usage(
    id: string,
    kind: string,
    model: string,
    input: number | null,
    output: number | null,
    cost: number | null,
    status = 'complete',
  ) {
    this.db
      .prepare(
        'INSERT INTO usage VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET input=excluded.input,output=excluded.output,cost=excluded.cost,status=excluded.status',
      )
      .run(id, Date.now(), kind, model, input, output, cost, status);
  }
  summary(timezone: string, now = Date.now()) {
    const rows = this.db
      .prepare('SELECT * FROM usage WHERE time>=?')
      .all(now - 48 * 3600000)
      .filter((r) => dayKey(Number(r.time), timezone) === dayKey(now, timezone));
    const cost = (kind: string) => {
      const chosen = rows.filter(
        (r) => kind === 'all' || (kind === 'voice' ? r.kind !== 'llm' : r.kind === kind),
      );
      return {
        known: chosen.reduce((s, r) => s + Number(r.cost || 0), 0),
        pending: chosen.filter((r) => r.cost === null).length,
      };
    };
    return {
      input: rows.reduce((s, r) => s + Number(r.input || 0), 0),
      output: rows.reduce((s, r) => s + Number(r.output || 0), 0),
      tokensPending: rows.filter((r) => r.kind === 'llm' && (r.input === null || r.output === null)).length,
      model: cost('llm'),
      modelLifetime: {
        known: Number(
          this.db.prepare("SELECT SUM(cost) AS value FROM usage WHERE kind='llm'").get()!.value || 0,
        ),
        pending: Number(
          this.db.prepare("SELECT COUNT(*) AS value FROM usage WHERE kind='llm' AND cost IS NULL").get()!
            .value,
        ),
      },
      voice: cost('voice'),
      total: cost('all'),
      currency: 'USD',
      estimated: true,
      uptimeMs: Number(this.db.prepare('SELECT milliseconds FROM runtime WHERE id=1').get()!.milliseconds),
    };
  }
  tick(ms: number) {
    this.db.prepare('UPDATE runtime SET milliseconds=milliseconds+? WHERE id=1').run(ms);
  }
}
export const store = new Store(resolve(dataDirectory(), 'joe.sqlite'));
let last = performance.now();
const heartbeat = setInterval(() => {
  const now = performance.now();
  store.tick(Math.round(now - last));
  last = now;
}, 10000);
heartbeat.unref();
