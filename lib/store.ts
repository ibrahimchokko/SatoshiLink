import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Invoice, Withdrawal } from './types';

/**
 * Tiny JSON-file repository. Writes are serialized with an in-process mutex
 * and done atomically (temp file + rename) so concurrent status polls can't corrupt the file.
 */

const INVOICES = path.join(process.cwd(), 'data', 'invoices.json');
const WITHDRAWALS = path.join(process.cwd(), 'data', 'withdrawals.json');

let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

async function readAll<T = Invoice>(file = INVOICES): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return raw.trim() ? (JSON.parse(raw) as T[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

async function writeAll(items: unknown[], file = INVOICES) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

export async function listInvoices(): Promise<Invoice[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  return (await readAll()).find((i) => i.id === id);
}

export function createInvoice(invoice: Invoice): Promise<Invoice> {
  return withLock(async () => {
    const all = await readAll();
    all.push(invoice);
    await writeAll(all);
    return invoice;
  });
}

/** Applies a patch; only writes to disk when something actually changed. */
export function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice | undefined> {
  return withLock(async () => {
    const all = await readAll();
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    const current = all[idx];
    const next = { ...current, ...patch };
    const changed = (Object.keys(patch) as (keyof Invoice)[]).some((k) => current[k] !== next[k]);
    if (!changed) return current;
    all[idx] = next;
    await writeAll(all);
    return next;
  });
}

// ---- Withdrawals ----

export async function listWithdrawals(): Promise<Withdrawal[]> {
  const all = await readAll<Withdrawal>(WITHDRAWALS);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createWithdrawal(w: Withdrawal): Promise<Withdrawal> {
  return withLock(async () => {
    const all = await readAll<Withdrawal>(WITHDRAWALS);
    all.push(w);
    await writeAll(all, WITHDRAWALS);
    return w;
  });
}

export function updateWithdrawal(id: string, patch: Partial<Withdrawal>): Promise<Withdrawal | undefined> {
  return withLock(async () => {
    const all = await readAll<Withdrawal>(WITHDRAWALS);
    const idx = all.findIndex((w) => w.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...patch };
    await writeAll(all, WITHDRAWALS);
    return all[idx];
  });
}
