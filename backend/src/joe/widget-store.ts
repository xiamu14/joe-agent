import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { validateResource, type ResourceSchema } from './widget-resources';

const id = z.string().regex(/^[A-Za-z0-9_-]{21}$/);
const widgetType = z.enum(['builtin.costs', 'builtin.settings', 'builtin.weather', 'youtube.video']);
const commandBase = { protocolVersion: z.literal(1), commandId: id, canvasId: id, instanceId: id, expectedRevision: z.number().int().nonnegative() };
export const widgetCommandSchema = z.discriminatedUnion('type', [
  z.object({ ...commandBase, type: z.literal('widget.present'), widgetType, bindings: z.record(z.string(), z.object({ resourceId: id, pointer: z.literal('') })), view: z.object({ kind: z.literal('registered'), name: z.string(), version: z.literal(1) }), visible: z.boolean().default(true) }),
  z.object({ ...commandBase, type: z.literal('widget.visibility'), visible: z.boolean() }),
  z.object({ ...commandBase, type: z.literal('widget.remove') }),
]);
type Command = z.infer<typeof widgetCommandSchema>;
type Instance = { protocolVersion: 1; canvasId: string; instanceId: string; widgetType: z.infer<typeof widgetType>; revision: number; visible: boolean; bindings: Record<string, { resourceId: string; pointer: string }>; view: { kind: 'registered'; name: string; version: 1 } };
const names: Record<Instance['widgetType'], string> = { 'builtin.costs': 'costs', 'builtin.settings': 'settings', 'builtin.weather': 'weather', 'youtube.video': 'video' };

export class WidgetStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS widget_canvases (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS widget_session_canvases (session_id TEXT PRIMARY KEY, canvas_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS widget_canvas_initialized (canvas_id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS widget_instances (canvas_id TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(canvas_id,id));
      CREATE TABLE IF NOT EXISTS widget_resources (canvas_id TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(canvas_id,id));
      CREATE TABLE IF NOT EXISTS widget_commands (id TEXT PRIMARY KEY, payload TEXT NOT NULL, result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS widget_events (cursor INTEGER PRIMARY KEY AUTOINCREMENT, canvas_id TEXT NOT NULL, event_id TEXT NOT NULL UNIQUE, data TEXT NOT NULL);`);
  }
  createCanvas() {
    const canvasId = nanoid();
    this.db.prepare('INSERT INTO widget_canvases VALUES (?)').run(canvasId);
    return canvasId;
  }
  canvasForSession(sessionId: string) {
    const row = this.db.prepare('SELECT canvas_id FROM widget_session_canvases WHERE session_id=?').get(sessionId);
    if (row) return String(row.canvas_id);
    const canvasId = this.createCanvas();
    this.db.prepare('INSERT INTO widget_session_canvases VALUES (?,?)').run(sessionId, canvasId);
    return canvasId;
  }
  initializeCanvas(canvasId: string, cards: ('costs' | 'settings' | 'weather' | 'video')[]) {
    this.requireCanvas(canvasId);
    if (this.db.prepare('SELECT canvas_id FROM widget_canvas_initialized WHERE canvas_id=?').get(canvasId)) return;
    for (const card of cards) {
      const type = card === 'video' ? 'youtube.video' : `builtin.${card}`;
      if (!this.snapshot(canvasId).instances.some((item: Instance) => item.widgetType === type)) this.presentBuiltin(canvasId, card);
    }
    this.db.prepare('INSERT OR IGNORE INTO widget_canvas_initialized VALUES (?)').run(canvasId);
  }
  presentBuiltin(canvasId: string, card: 'costs' | 'settings' | 'weather' | 'video', visible = true) {
    const widgetType = card === 'video' ? 'youtube.video' : `builtin.${card}`;
    const current = this.snapshot(canvasId).instances.find((instance: Instance) => instance.widgetType === widgetType) as Instance | undefined;
    if (current?.visible === visible) return current;
    const base = { protocolVersion: 1, commandId: nanoid(), canvasId, instanceId: current?.instanceId ?? nanoid(), expectedRevision: current?.revision ?? 0 };
    const event = current
      ? this.command({ ...base, type: 'widget.visibility', visible })
      : this.command({ ...base, type: 'widget.present', widgetType, bindings: {}, view: { kind: 'registered', name: card, version: 1 }, visible });
    return event.instance as Instance;
  }
  presentData(canvasId: string, card: 'weather' | 'video', data: unknown, expectedRevision: number) {
    const widgetType = card === 'video' ? 'youtube.video' : 'builtin.weather';
    const schema = card === 'video' ? 'youtube.search@1' : 'weather@1';
    const current = this.snapshot(canvasId).instances.find((item: Instance) => item.widgetType === widgetType) as Instance | undefined;
    if ((current?.revision ?? 0) !== expectedRevision) throw new Error('卡片已更改，请重新请求');
    const resourceId = current?.bindings.data?.resourceId ?? current?.bindings.weather?.resourceId ?? nanoid();
    this.putResource(canvasId, resourceId, schema, data);
    return this.command({ protocolVersion: 1, commandId: nanoid(), canvasId, instanceId: current?.instanceId ?? nanoid(), expectedRevision, type: 'widget.present', widgetType, bindings: { data: { resourceId, pointer: '' } }, view: { kind: 'registered', name: card, version: 1 }, visible: true }).instance as Instance;
  }
  requireCanvas(canvasId: string) {
    id.parse(canvasId);
    if (!this.db.prepare('SELECT id FROM widget_canvases WHERE id=?').get(canvasId)) throw new Error('画布不存在');
  }
  snapshot(canvasId: string) {
    this.requireCanvas(canvasId);
    const instances = this.db.prepare('SELECT data FROM widget_instances WHERE canvas_id=?').all(canvasId).map(row => JSON.parse(String(row.data)));
    const resources = this.db.prepare('SELECT data FROM widget_resources WHERE canvas_id=?').all(canvasId).map(row => JSON.parse(String(row.data)));
    const row = this.db.prepare('SELECT COALESCE(MAX(cursor),0) AS cursor FROM widget_events').get();
    return { instances, resources, cursor: Number(row!.cursor) };
  }
  events(canvasId: string, after: number) {
    this.requireCanvas(canvasId);
    return this.db.prepare('SELECT cursor,event_id,data FROM widget_events WHERE canvas_id=? AND cursor>? ORDER BY cursor').all(canvasId, after).map(row => ({ ...JSON.parse(String(row.data)), eventId: row.event_id, cursor: String(row.cursor) }));
  }
  putResource(canvasId: string, resourceId: string, schema: ResourceSchema, data: unknown) {
    this.requireCanvas(canvasId);
    id.parse(resourceId);
    const checked = validateResource(schema, data);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT data,revision FROM widget_resources WHERE canvas_id=? AND id=?').get(canvasId, resourceId);
      if (row && JSON.parse(String(row.data)).schema !== schema) throw new Error('资源类型不能更改');
      const resource = { resourceId, schema, revision: Number(row?.revision ?? 0) + 1, status: 'ready', updatedAt: new Date().toISOString(), data: checked, error: null };
      this.db.prepare('INSERT INTO widget_resources VALUES (?,?,?,?) ON CONFLICT(canvas_id,id) DO UPDATE SET revision=excluded.revision,data=excluded.data').run(canvasId, resourceId, resource.revision, JSON.stringify(resource));
      const event = this.event(canvasId, 'resource.snapshot', { resource });
      this.db.exec('COMMIT');
      return event;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private event(canvasId: string, type: string, payload: Record<string, unknown>) {
    const eventId = nanoid();
    const data = { protocolVersion: 1, canvasId, type, ...payload };
    const result = this.db.prepare('INSERT INTO widget_events(canvas_id,event_id,data) VALUES (?,?,?)').run(canvasId, eventId, JSON.stringify(data));
    return { ...data, eventId, cursor: String(result.lastInsertRowid) };
  }
  command(raw: unknown) {
    const command: Command = widgetCommandSchema.parse(raw);
    this.requireCanvas(command.canvasId);
    const payload = JSON.stringify(command);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const prior = this.db.prepare('SELECT payload,result FROM widget_commands WHERE id=?').get(command.commandId);
      if (prior) {
        if (prior.payload !== payload) throw new Error('命令 ID 已用于其他请求');
        this.db.exec('COMMIT');
        return JSON.parse(String(prior.result));
      }
      const row = this.db.prepare('SELECT data FROM widget_instances WHERE canvas_id=? AND id=?').get(command.canvasId, command.instanceId);
      const current: Instance | undefined = row ? JSON.parse(String(row.data)) : undefined;
      if ((current?.revision ?? 0) !== command.expectedRevision) throw new Error('卡片版本冲突');
      let event: unknown;
      if (command.type === 'widget.present') {
        if (names[command.widgetType] !== command.view.name || (current && current.widgetType !== command.widgetType)) throw new Error('卡片模板无效');
        if (this.snapshot(command.canvasId).instances.some((item: Instance) => item.widgetType === command.widgetType && item.instanceId !== command.instanceId)) throw new Error('同类型卡片已存在');
        for (const binding of Object.values(command.bindings)) {
          const resource = this.db.prepare('SELECT data FROM widget_resources WHERE canvas_id=? AND id=?').get(command.canvasId, binding.resourceId);
          if (!resource) throw new Error('资源不存在');
          const schema = JSON.parse(String(resource.data)).schema;
          if ((command.widgetType === 'builtin.weather' && schema !== 'weather@1') || (command.widgetType === 'youtube.video' && schema !== 'youtube.search@1') || command.widgetType === 'builtin.costs' || command.widgetType === 'builtin.settings') throw new Error('资源类型与卡片不匹配');
        }
        const instance: Instance = { protocolVersion: 1, canvasId: command.canvasId, instanceId: command.instanceId, widgetType: command.widgetType, revision: command.expectedRevision + 1, visible: command.visible, bindings: command.bindings, view: command.view };
        this.db.prepare('INSERT INTO widget_instances VALUES (?,?,?,?) ON CONFLICT(canvas_id,id) DO UPDATE SET revision=excluded.revision,data=excluded.data').run(command.canvasId, command.instanceId, instance.revision, JSON.stringify(instance));
        event = this.event(command.canvasId, 'widget.snapshot', { instance });
      } else {
        if (!current) throw new Error('卡片不存在');
        if (command.type === 'widget.remove') {
          this.db.prepare('DELETE FROM widget_instances WHERE canvas_id=? AND id=?').run(command.canvasId, command.instanceId);
          event = this.event(command.canvasId, 'widget.removed', { instanceId: command.instanceId, revision: current.revision + 1 });
        } else {
          const instance = { ...current, revision: current.revision + 1, visible: command.visible };
          this.db.prepare('UPDATE widget_instances SET revision=?,data=? WHERE canvas_id=? AND id=?').run(instance.revision, JSON.stringify(instance), command.canvasId, command.instanceId);
          event = this.event(command.canvasId, 'widget.snapshot', { instance });
        }
      }
      this.db.prepare('INSERT INTO widget_commands VALUES (?,?,?)').run(command.commandId, payload, JSON.stringify(event));
      this.db.exec('COMMIT');
      return event;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
