import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { nanoid } from 'nanoid';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FinanceStore } from '../src/joe/finance-store';
import { accountTotals, balanceMinor } from '../../shared/finance';

test('money conversion is exact and rejects rounding and overflow', () => {
  assert.equal(balanceMinor('1234.56', 'CNY'), 123456);
  assert.equal(balanceMinor('-0.01', 'USD'), -1);
  assert.equal(balanceMinor('1234', 'JPY'), 1234);
  assert.equal(balanceMinor('1.234', 'KWD'), 1234);
  for (const value of ['1.001', '1e3', '1,200', 'NaN', '9007199254740992']) assert.throws(() => balanceMinor(value, 'CNY'));
});

test('credit debt is negative and totals count only the latest balance per currency', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const finance = new FinanceStore(db), canvas = nanoid(), attachmentId = nanoid();
    const sources = new Map([[attachmentId, { hash: 'accounts', receivedAt: new Date().toISOString() }]]);
    const base = { attachmentId, bank: '招商银行', currency: 'CNY', balance: '100.00', rawBalance: '100.00', observedAt: null };
    finance.record(canvas, [
      { ...base, last4: '1111' },
      { ...base, last4: '2222', accountType: 'credit', balance: '30.50' },
      { ...base, last4: '3333', accountType: 'credit', balance: '-10.00' },
      { ...base, last4: '4444', currency: 'USD', balance: '20.00' },
    ], sources);
    const snapshot = finance.snapshot(canvas);
    assert.equal(snapshot.accounts[1].records[0].balanceMinor, -3050);
    assert.equal(snapshot.accounts[2].records[0].balanceMinor, -1000);
    snapshot.accounts[0].records.push({ ...snapshot.accounts[0].records[0], balanceMinor: 999999 });
    assert.deepEqual(accountTotals(snapshot.accounts), [{ currency: 'CNY', balanceMinor: 5950 }, { currency: 'USD', balanceMinor: 2000 }]);
    assert.deepEqual(accountTotals([]), []);
  } finally { db.close(); }
});

test('balances survive reopening, deduplicate content, and keep older screenshots out of the latest balance', () => {
  const directory = mkdtempSync(join(tmpdir(), 'balance-history-'));
  const path = join(directory, 'balances.sqlite');
  let db = new DatabaseSync(path);
  try {
    const finance = new FinanceStore(db), canvas = nanoid(), attachmentId = nanoid();
    const input = { attachmentId, bank: '招商银行', last4: '1234', currency: 'CNY', balance: '12.34', rawBalance: '12.34', observedAt: '2025-01-02T00:00:00Z' };
    const sources = new Map([[attachmentId, { hash: 'same-image', receivedAt: '2025-01-03T00:00:00Z' }]]);
    assert.equal(finance.record(canvas, [input], sources), 1);
    const id = finance.snapshot(canvas).accounts[0].id;
    assert.equal(finance.record(canvas, [input], sources), 0);
    const reupload = nanoid();
    assert.equal(finance.record(canvas, [{ ...input, attachmentId: reupload }], new Map([[reupload, sources.get(attachmentId)!]])), 0);
    assert.equal(finance.record(canvas, [{ ...input, balance: '1.00', observedAt: '2025-01-01T00:00:00Z' }], new Map([[attachmentId, { ...sources.get(attachmentId)!, hash: 'older-image' }]])), 1);
    const reopened = new FinanceStore(db).snapshot(canvas);
    assert.equal(reopened.accounts[0].id, id);
    assert.equal(reopened.accounts[0].records.length, 2);
    assert.equal(reopened.accounts[0].records[0].balanceMinor, 1234);
    assert.equal(finance.snapshot(nanoid()).accounts.length, 0);
    assert.throws(() => finance.record(canvas, [{ ...input, balance: '99' }], sources), /不同余额/);
    assert.equal(finance.snapshot(canvas).accounts[0].records[0].balanceMinor, 1234);
    db.close(); db = new DatabaseSync(path);
    assert.deepEqual(new FinanceStore(db).snapshot(canvas), reopened);
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('invalid or ambiguous extraction rolls back the whole write', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const finance = new FinanceStore(db), canvas = nanoid(), attachmentId = nanoid();
    const input = { attachmentId, bank: '中国银行', last4: '9876', currency: 'CNY', balance: '10.00', rawBalance: '10.00', observedAt: null };
    const sources = new Map([[attachmentId, { hash: 'image', receivedAt: new Date().toISOString() }]]);
    for (const invalid of [{ ...input, last4: null }, { ...input, currency: 'BAD' }, { ...input, attachmentId: nanoid() }]) {
      assert.throws(() => finance.record(canvas, [input, invalid], sources));
      assert.deepEqual(finance.snapshot(canvas), { accounts: [] });
    }
  } finally { db.close(); }
});

test('named accounts need no invented tail digits and keep separate stable identities', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const finance = new FinanceStore(db), canvas = nanoid(), attachmentId = nanoid();
    const sources = new Map([[attachmentId, { hash: 'named-accounts', receivedAt: new Date().toISOString() }]]);
    const base = { attachmentId, bank: '平安银行', last4: null, currency: 'CNY', balance: '10.00', rawBalance: '10.00', observedAt: null, accountType: 'credit' as const };
    assert.equal(finance.record(canvas, [{ ...base, label: '平安银行信用卡1' }, { ...base, label: '平安银行信用卡2' }], sources), 2);
    const first = finance.snapshot(canvas);
    assert.equal(first.accounts[0].last4, null);
    assert.equal(first.accounts[0].label, '平安银行信用卡1');
    assert.equal(first.accounts[0].records[0].balanceMinor, -1000);
    assert.equal(finance.record(canvas, [{ ...base, label: '平安银行信用卡1' }], sources), 0);
    assert.deepEqual(new FinanceStore(db).snapshot(canvas), first);
  } finally { db.close(); }
});

test('legacy account migration preserves IDs and referenced balance history', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE finance_accounts (id TEXT PRIMARY KEY, canvas_id TEXT NOT NULL, bank TEXT NOT NULL, last4 TEXT NOT NULL, currency TEXT NOT NULL, UNIQUE(canvas_id,bank,last4,currency));
      CREATE TABLE finance_balances (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES finance_accounts(id), attachment_id TEXT NOT NULL, source_hash TEXT NOT NULL, balance_minor INTEGER NOT NULL, raw_balance TEXT NOT NULL, observed_at TEXT NOT NULL, received_at TEXT NOT NULL, UNIQUE(account_id,source_hash));`);
    const id = nanoid(), record = nanoid(), canvas = nanoid(), attachment = nanoid(), time = new Date().toISOString();
    db.prepare('INSERT INTO finance_accounts VALUES (?,?,?,?,?)').run(id, canvas, '招商银行', '1234', 'CNY');
    db.prepare('INSERT INTO finance_balances VALUES (?,?,?,?,?,?,?,?)').run(record, id, attachment, 'legacy', 100, '1.00', time, time);
    const finance = new FinanceStore(db);
    assert.equal(finance.snapshot(canvas).accounts[0].id, id);
    assert.equal(finance.snapshot(canvas).accounts[0].last4, '1234');
    assert.equal(finance.snapshot(canvas).accounts[0].records[0].id, record);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys, 1);
  } finally { db.close(); }
});

test('Alipay wallet and Yu’e Bao have separate names without card tails', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const finance = new FinanceStore(db), canvas = nanoid(), attachmentId = nanoid();
    const sources = new Map([[attachmentId, { hash: 'wallet', receivedAt: new Date().toISOString() }]]);
    const base = { attachmentId, last4: null, label: null, currency: 'CNY', balance: '100.00', rawBalance: '100.00', observedAt: null };
    finance.record(canvas, [{ ...base, bank: '支付宝' }, { ...base, bank: '余额宝', balance: 200.00 }], sources);
    const accounts = finance.snapshot(canvas).accounts;
    assert.deepEqual(accounts.map(account => [account.bank, account.label, account.last4]), [['支付宝', '支付宝余额', null], ['支付宝', '余额宝', null]]);
    assert.deepEqual(accountTotals(accounts), [{ currency: 'CNY', balanceMinor: 30000 }]);
    assert.equal(finance.record(canvas, [{ ...base, bank: '支付宝', label: '余额宝', balance: '200.00' }], sources), 0);
  } finally { db.close(); }
});

test('numeric model balances normalize without allowing invalid money or precision loss', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const finance = new FinanceStore(db), canvas = nanoid(), attachmentId = nanoid();
    const sources = new Map([[attachmentId, { hash: 'numeric', receivedAt: new Date().toISOString() }]]);
    const base = { attachmentId, bank: '支付宝', label: '余额宝', last4: null, currency: 'CNY', rawBalance: '44,649.81', observedAt: null };
    for (const balance of [NaN, Infinity, 0.001, Number.MAX_SAFE_INTEGER, '1,200.00', '']) {
      assert.throws(() => finance.record(canvas, [{ ...base, balance }], sources));
      assert.equal(finance.snapshot(canvas).accounts.length, 0);
    }
    finance.record(canvas, [{ ...base, balance: 44649.81 }], sources);
    assert.equal(finance.snapshot(canvas).accounts[0].records[0].balanceMinor, 4464981);
  } finally { db.close(); }
});
