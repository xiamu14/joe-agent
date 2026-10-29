import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { idSchema } from './id';

export type BehaviorDefinition = {
  widgetType: string; eventName: string; definitionVersion: number; policyVersion: number;
  parse(value: unknown): unknown; validateTransition(previous: unknown, next: unknown): void;
};
const eventSchema = z.object({
  behaviorProtocolVersion: z.literal(1), eventId: idSchema, recordId: idSchema,
  revision: z.number().int().positive().safe(), widgetType: z.string().max(100), widgetVersion: z.literal(1),
  definitionVersion: z.literal(1), policyVersion: z.literal(1), eventName: z.string().max(100),
  occurredAt: z.string().datetime(), trigger: z.enum(['directInteraction', 'userInstruction']),
  canvasId: idSchema, instanceId: idSchema, payload: z.unknown(),
}).strict();
const submissionSchema = z.object({ sessionId: idSchema, event: eventSchema }).strict();

export class BehaviorStore {
  constructor(private db: DatabaseSync, private definitions: BehaviorDefinition[]) {
    db.exec(`CREATE TABLE IF NOT EXISTS behavior_events (
      cursor INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL, owner TEXT NOT NULL,
      record_id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, received_at TEXT NOT NULL,
      UNIQUE(owner,record_id,revision));
      CREATE TABLE IF NOT EXISTS behavior_records (
      owner TEXT NOT NULL, id TEXT NOT NULL, canvas_id TEXT NOT NULL, widget_type TEXT NOT NULL,
      revision INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(owner,id));`);
  }
  accept(raw: unknown, owner: string, allowedTrigger: 'directInteraction' | 'userInstruction' = 'directInteraction') {
    const input = submissionSchema.parse(raw), event = input.event;
    if (event.trigger !== allowedTrigger) throw new Error('播放来源未经验证');
    const definition = this.definitions.find(item => item.widgetType === event.widgetType && item.eventName === event.eventName && item.definitionVersion === event.definitionVersion && item.policyVersion === event.policyVersion);
    if (!definition) throw new Error('行为定义未注册');
    event.payload = definition.parse(event.payload);
    const binding = this.db.prepare('SELECT canvas_id FROM widget_session_canvases WHERE session_id=?').get(input.sessionId);
    const instance = this.db.prepare('SELECT data FROM widget_instances WHERE canvas_id=? AND id=?').get(event.canvasId, event.instanceId);
    if (!binding || binding.canvas_id !== event.canvasId || !instance || JSON.parse(String(instance.data)).widgetType !== event.widgetType)
      throw new Error('行为不属于该会话或卡片');
    const data = JSON.stringify(input), receivedAt = new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const duplicate = this.db.prepare('SELECT data,owner,cursor FROM behavior_events WHERE event_id=?').get(event.eventId);
      if (duplicate) {
        if (duplicate.owner !== owner || duplicate.data !== data) throw new Error('事件 ID 已用于其他内容');
        this.db.exec('COMMIT');
        return { eventId: event.eventId, cursor: String(duplicate.cursor) };
      }
      const prior = this.db.prepare('SELECT data,revision FROM behavior_records WHERE owner=? AND id=?').get(owner, event.recordId);
      if (prior) {
        const old = submissionSchema.parse(JSON.parse(String(prior.data)));
        const a = old.event;
        if (old.sessionId !== input.sessionId || a.canvasId !== event.canvasId || a.instanceId !== event.instanceId || a.widgetType !== event.widgetType || a.trigger !== event.trigger || a.eventName !== event.eventName)
          throw new Error('记录身份不能更改');
        if (event.revision > Number(prior.revision)) definition.validateTransition(a.payload, event.payload);
        else definition.validateTransition(event.payload, a.payload);
      }
      const inserted = this.db.prepare('INSERT INTO behavior_events(event_id,owner,record_id,revision,data,received_at) VALUES (?,?,?,?,?,?)')
        .run(event.eventId, owner, event.recordId, event.revision, data, receivedAt);
      if (!prior || event.revision > Number(prior.revision)) this.db.prepare(`INSERT INTO behavior_records VALUES (?,?,?,?,?,?)
        ON CONFLICT(owner,id) DO UPDATE SET revision=excluded.revision,data=excluded.data`)
        .run(owner, event.recordId, event.canvasId, event.widgetType, event.revision, data);
      this.db.exec('COMMIT');
      return { eventId: event.eventId, cursor: String(inserted.lastInsertRowid) };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  records(owner: string, canvasId?: string, widgetType?: string) {
    return this.db.prepare(`SELECT data FROM behavior_records WHERE owner=?
      AND (? IS NULL OR canvas_id=?) AND (? IS NULL OR widget_type=?) ORDER BY rowid`)
      .all(owner, canvasId ?? null, canvasId ?? null, widgetType ?? null, widgetType ?? null)
      .map(row => submissionSchema.parse(JSON.parse(String(row.data))).event);
  }
}
