import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { idSchema } from './id';

const operationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('canvas.rename'), name: z.string().trim().min(1).max(80) }).strict(),
  z.object({ type: z.literal('widget.visibility'), instanceId: idSchema, expectedRevision: z.number().int().nonnegative(), visible: z.boolean() }).strict(),
]);
export const canvasChangeSchema = z.object({
  protocolVersion: z.literal(1), type: z.literal('canvas.change'), commandId: idSchema,
  canvasId: idSchema, expectedCanvasRevision: z.number().int().nonnegative(),
  operations: z.array(operationSchema).min(1).max(100),
}).strict();
export type CanvasMetadata = { id: string; name: string; revision: number };

export class CanvasStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS canvas_metadata (id TEXT PRIMARY KEY, name TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS canvas_directory (workspace_id TEXT NOT NULL, slot INTEGER NOT NULL, canvas_id TEXT NOT NULL UNIQUE, PRIMARY KEY(workspace_id,slot));
      INSERT OR IGNORE INTO canvas_metadata SELECT id,'未命名',0 FROM widget_canvases;
      CREATE TRIGGER IF NOT EXISTS canvas_created AFTER INSERT ON widget_canvases BEGIN
        INSERT OR IGNORE INTO canvas_metadata VALUES (NEW.id,'未命名',0); END;
      CREATE TRIGGER IF NOT EXISTS canvas_widget_insert AFTER INSERT ON widget_instances BEGIN
        UPDATE canvas_metadata SET revision=revision+1 WHERE id=NEW.canvas_id; END;
      CREATE TRIGGER IF NOT EXISTS canvas_widget_update AFTER UPDATE ON widget_instances BEGIN
        UPDATE canvas_metadata SET revision=revision+1 WHERE id=NEW.canvas_id; END;
      CREATE TRIGGER IF NOT EXISTS canvas_widget_delete AFTER DELETE ON widget_instances BEGIN
        UPDATE canvas_metadata SET revision=revision+1 WHERE id=OLD.canvas_id; END;`);
  }
  metadata(id: string): CanvasMetadata {
    const row = this.db.prepare('SELECT * FROM canvas_metadata WHERE id=?').get(id);
    if (!row) throw new Error('空间不存在');
    return { id: String(row.id), name: String(row.name), revision: Number(row.revision) };
  }
  bind(workspaceId: string, slot: number, canvasId: string) {
    const existing = this.db.prepare('SELECT canvas_id FROM canvas_directory WHERE workspace_id=? AND slot=?').get(workspaceId, slot);
    if (existing) return String(existing.canvas_id);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO canvas_directory VALUES (?,?,?)').run(workspaceId, slot, canvasId);
      this.db.prepare("UPDATE canvas_metadata SET name=? WHERE id=? AND name='未命名'").run(`空间${slot + 1}`, canvasId);
      this.db.exec('COMMIT');
      return canvasId;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  directory(currentId: string) {
    const rows = this.db.prepare(`SELECT d.canvas_id FROM canvas_directory d WHERE d.workspace_id=
      (SELECT workspace_id FROM canvas_directory WHERE canvas_id=?) ORDER BY d.slot`).all(currentId);
    return rows.length ? rows.map(row => this.metadata(String(row.canvas_id))) : [this.metadata(currentId)];
  }
  change(currentId: string, raw: unknown) {
    const command = canvasChangeSchema.parse(raw);
    if (!this.directory(currentId).some(canvas => canvas.id === command.canvasId)) throw new Error('空间不在当前工作区');
    const payload = JSON.stringify(command);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const prior = this.db.prepare('SELECT payload,result FROM widget_commands WHERE id=?').get(command.commandId);
      if (prior) {
        if (prior.payload !== payload) throw new Error('命令 ID 已用于其他请求');
        this.db.exec('COMMIT');
        return JSON.parse(String(prior.result));
      }
      if (this.metadata(command.canvasId).revision !== command.expectedCanvasRevision) throw new Error('空间版本冲突');
      const instances: unknown[] = [];
      let changed = false;
      for (const op of command.operations) {
        if (op.type === 'canvas.rename') {
          if (this.metadata(command.canvasId).name === op.name) continue;
          this.db.prepare('UPDATE canvas_metadata SET name=?,revision=revision+1 WHERE id=?').run(op.name, command.canvasId);
          changed = true;
        } else {
          const row = this.db.prepare('SELECT data FROM widget_instances WHERE canvas_id=? AND id=?').get(command.canvasId, op.instanceId);
          if (!row) throw new Error('卡片不存在');
          const instance = JSON.parse(String(row.data));
          if (instance.revision !== op.expectedRevision) throw new Error('卡片版本冲突');
          if (instance.visible === op.visible) continue;
          instance.visible = op.visible;
          instance.revision++;
          this.db.prepare('UPDATE widget_instances SET revision=?,data=? WHERE canvas_id=? AND id=?').run(instance.revision, JSON.stringify(instance), command.canvasId, op.instanceId);
          instances.push(instance);
          changed = true;
        }
      }
      const result = { protocolVersion: 1, type: 'canvas.changed', commandId: command.commandId,
        canvasId: command.canvasId, canvas: this.metadata(command.canvasId), instances, status: changed ? 'applied' : 'unchanged' };
      if (changed) this.db.prepare('INSERT INTO widget_events(canvas_id,event_id,data) VALUES (?,?,?)').run(command.canvasId, nanoid(), JSON.stringify(result));
      this.db.prepare('INSERT INTO widget_commands VALUES (?,?,?)').run(command.commandId, payload, JSON.stringify(result));
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
