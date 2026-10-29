import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

// Development reset: legacy session data is intentionally discarded; settings and usage remain.
export function clearLegacySessions(db: DatabaseSync, memoryPath: string) {
  const sessions = db.prepare('SELECT id FROM sessions').all().map(row => String(row.id)).filter(id => uuid.test(id));
  if (!sessions.length) return;
  const attached = existsSync(memoryPath);
  if (attached) db.prepare('ATTACH DATABASE ? AS legacy_memory').run(memoryPath);
  try {
    db.exec('BEGIN IMMEDIATE');
    const hasTable = (name: string, schema = 'main') => Boolean(db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type=\'table\' AND name=?`).get(name));
    for (const session of sessions) {
      if (attached && hasTable('mastra_threads', 'legacy_memory')) {
        const thread = `joe:${session}`;
        if (hasTable('mastra_messages', 'legacy_memory')) db.prepare('DELETE FROM legacy_memory.mastra_messages WHERE thread_id=?').run(thread);
        if (hasTable('mastra_thread_state', 'legacy_memory')) db.prepare('DELETE FROM legacy_memory.mastra_thread_state WHERE threadId=?').run(thread);
        db.prepare('DELETE FROM legacy_memory.mastra_threads WHERE id=?').run(thread);
      }
      if (hasTable('widget_session_canvases')) {
        const canvas = db.prepare('SELECT canvas_id FROM widget_session_canvases WHERE session_id=?').get(session)?.canvas_id;
        if (canvas) {
          for (const table of ['widget_instances', 'widget_resources', 'widget_events']) if (hasTable(table)) db.prepare(`DELETE FROM ${table} WHERE canvas_id=?`).run(canvas);
          if (hasTable('widget_commands')) db.prepare("DELETE FROM widget_commands WHERE json_extract(payload, '$.canvasId')=?").run(canvas);
          db.prepare('DELETE FROM widget_session_canvases WHERE session_id=?').run(session);
          if (hasTable('widget_canvas_initialized')) db.prepare('DELETE FROM widget_canvas_initialized WHERE canvas_id=?').run(canvas);
          if (hasTable('widget_canvases')) db.prepare('DELETE FROM widget_canvases WHERE id=?').run(canvas);
        }
      }
      db.prepare('DELETE FROM messages WHERE session=?').run(session);
      db.prepare('DELETE FROM attachments WHERE session=?').run(session);
      db.prepare('DELETE FROM sessions WHERE id=?').run(session);
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { if (attached) db.exec('DETACH DATABASE legacy_memory'); }
}
