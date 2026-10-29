import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Invoice } from './types';

/**
 * Tiny JSON-file repository. Writes are serialized with an in-process mutex
 * and done atomically (temp file + rename) so concurrent status polls can't corrupt the file.
 */

const FILE = path.join(process.cwd(), 'data', 'invoices.json');

let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Invoice[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return raw.trim() ? (JSON.parse(raw) as Invoice[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

async function writeAll(invoices: Invoice[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(invoices, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
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
