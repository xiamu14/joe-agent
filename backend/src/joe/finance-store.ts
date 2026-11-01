import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { balanceMinor, type FinanceSnapshot } from '../../../shared/finance';
import { extractedAccountSchema, type ExtractedAccount } from './finance-schema';

export class FinanceStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY, canvas_id TEXT NOT NULL, bank TEXT NOT NULL, last4 TEXT NOT NULL, currency TEXT NOT NULL,
      UNIQUE(canvas_id,bank,last4,currency));
      CREATE TABLE IF NOT EXISTS finance_balances (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES finance_accounts(id), attachment_id TEXT NOT NULL,
      source_hash TEXT NOT NULL, balance_minor INTEGER NOT NULL, raw_balance TEXT NOT NULL,
      observed_at TEXT NOT NULL, received_at TEXT NOT NULL, UNIQUE(account_id,source_hash));`);
    if (!db.prepare('PRAGMA table_info(finance_accounts)').all().some(column => column.name === 'label')) {
      db.exec('PRAGMA foreign_keys=OFF');
      try {
        db.exec(`BEGIN IMMEDIATE;
          CREATE TABLE finance_accounts_next (
            id TEXT PRIMARY KEY, canvas_id TEXT NOT NULL, bank TEXT NOT NULL, last4 TEXT,
            currency TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', identity TEXT NOT NULL,
            UNIQUE(canvas_id,bank,identity,currency));
          INSERT INTO finance_accounts_next SELECT id,canvas_id,bank,last4,currency,'',last4 FROM finance_accounts;
          DROP TABLE finance_accounts;
          ALTER TABLE finance_accounts_next RENAME TO finance_accounts;
          COMMIT;`);
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      finally { db.exec('PRAGMA foreign_keys=ON'); }
    }
  }
  record(canvasId: string, accounts: ExtractedAccount[], sources: Map<string, { hash: string; receivedAt: string }>) {
    let added = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const raw of accounts) {
        const account = extractedAccountSchema.parse(raw);
        const source = sources.get(account.attachmentId);
        if (!source || !account.bank || (!account.last4 && !account.label) || !account.currency || account.balance === null) throw new Error('账户信息不完整，请补充银行、尾号或账户名称、币种和余额');
        const bank = account.bank.replace(/\s+/g, '');
        const identity = account.last4 ?? `name:${account.label}`;
        const amount = balanceMinor(account.balance, account.currency);
        const minor = account.accountType === 'credit' ? -Math.abs(amount) : amount;
        const time = account.observedAt ?? source.receivedAt;
        if (Date.parse(time) > Date.now() + 86400000) throw new Error('余额时间晚于当前时间，请核对');
        let row = this.db.prepare('SELECT id FROM finance_accounts WHERE canvas_id=? AND bank=? AND identity=? AND currency=?').get(canvasId, bank, identity, account.currency);
        if (!row) {
          const id = nanoid();
          this.db.prepare('INSERT INTO finance_accounts (id,canvas_id,bank,last4,currency,label,identity) VALUES (?,?,?,?,?,?,?)').run(id, canvasId, bank, account.last4, account.currency, account.label ?? '', identity);
          row = { id };
        }
        const prior = this.db.prepare('SELECT balance_minor FROM finance_balances WHERE account_id=? AND source_hash=?').get(row.id, source.hash);
        if (prior) {
          if (prior.balance_minor !== minor) throw new Error('同一截图识别出不同余额，请核对原图');
          continue;
        }
        this.db.prepare('INSERT INTO finance_balances VALUES (?,?,?,?,?,?,?,?)').run(
          nanoid(), row.id, account.attachmentId, source.hash, minor, account.rawBalance, new Date(time).toISOString(), source.receivedAt,
        );
        added++;
      }
      this.db.exec('COMMIT');
      return added;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  snapshot(canvasId: string): FinanceSnapshot {
    // shortcut: show the latest 30 snapshots per account; add pagination for full-history browsing.
    const accounts = this.db.prepare('SELECT * FROM finance_accounts WHERE canvas_id=? ORDER BY rowid').all(canvasId);
    return { accounts: accounts.map(account => ({
      id: String(account.id), bank: String(account.bank), last4: account.last4 === null ? null : String(account.last4), label: String(account.label), currency: String(account.currency),
      records: this.db.prepare('SELECT * FROM finance_balances WHERE account_id=? ORDER BY observed_at DESC,received_at DESC,rowid DESC LIMIT 30').all(account.id).map(row => ({
        id: String(row.id), balanceMinor: Number(row.balance_minor), rawBalance: String(row.raw_balance),
        observedAt: String(row.observed_at), receivedAt: String(row.received_at), attachmentId: String(row.attachment_id),
      })),
    })) };
  }
}
