import 'server-only';
import { randomUUID } from 'node:crypto';
import { addInvoice, b64ToHex, channelBalance, friendlyLndError, getInfo, lookupInvoice, walletBalance } from './lnd';
import { cachedStatus, mapLndInvoice } from './status';
import { createInvoice, listInvoices, updateInvoice } from './store';
import { FINAL_STATUSES, type Invoice, type NodeBalance, type NodeInfo, type StatusResponse } from './types';
import type { CreateInvoiceInput } from './validation';
import { truncate } from './format';

export const INVOICE_EXPIRY_SEC = 3600;

export async function fetchNodeInfo(): Promise<{ ok: true; node: NodeInfo } | { ok: false; error: string; kind: string }> {
  try {
    const info = await getInfo();
    return {
      ok: true,
      node: {
        alias: info.alias,
        pubkey: info.identity_pubkey,
        network: info.chains?.[0]?.network ?? 'unknown',
        synced: Boolean(info.synced_to_chain),
        activeChannels: Number(info.num_active_channels ?? 0),
        blockHeight: Number(info.block_height ?? 0),
        version: info.version,
      },
    };
  } catch (e) {
    console.error('[lnd] getinfo failed:', (e as Error).message);
    const { message, kind } = friendlyLndError(e);
    return { ok: false, error: message, kind };
  }
}

export async function fetchBalance(): Promise<{ ok: true; balance: NodeBalance } | { ok: false; error: string; kind: string }> {
  try {
    const [channels, chain] = await Promise.all([channelBalance(), walletBalance()]);
    return {
      ok: true,
      balance: {
        lightningSat: Number(channels.local_balance?.sat ?? 0),
        pendingLightningSat: Number(channels.pending_open_local_balance?.sat ?? 0),
        onchainSat: Number(chain.confirmed_balance ?? 0),
        unconfirmedOnchainSat: Number(chain.unconfirmed_balance ?? 0),
      },
    };
  } catch (e) {
    console.error('[lnd] balance failed:', (e as Error).message);
    const { message, kind } = friendlyLndError(e);
    return { ok: false, error: message, kind };
  }
}

/** All invoices, with open ones re-checked against LND so every page shows the node's truth. */
export async function listInvoicesLive(): Promise<{ invoices: Invoice[]; nodeError?: string }> {
  const stored = await listInvoices();
  let nodeError: string | undefined;
  const invoices = await Promise.all(
    stored.map(async (inv) => {
      if (inv.status !== 'pending' && inv.status !== 'processing') return inv;
      const s = await refreshStatus(inv);
      nodeError ??= s.error;
      return { ...inv, status: s.status, settledAt: s.settledAt, amountPaidSat: s.amountPaidSat };
    }),
  );
  return { invoices, nodeError };
}

/** Totals shared by the dashboard and the wallet so both always show the same numbers. */
export function invoiceTotals(invoices: Invoice[]) {
  const paid = invoices.filter((i) => i.status === 'paid');
  const waiting = invoices.filter((i) => i.status === 'pending' || i.status === 'processing');
  return {
    paid,
    waiting,
    received: paid.reduce((sum, i) => sum + (i.amountPaidSat ?? i.amountSat), 0),
    outstanding: waiting.reduce((sum, i) => sum + i.amountSat, 0),
  };
}

export async function createLndInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const memo = truncate(`${input.clientName} – ${input.description}`, 100);
  const res = await addInvoice(input.amountSat, memo, INVOICE_EXPIRY_SEC);
  const now = new Date();
  const invoice: Invoice = {
    id: randomUUID().replace(/-/g, '').slice(0, 10),
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    description: input.description,
    amountSat: input.amountSat,
    memo,
    paymentRequest: res.payment_request,
    rHashHex: b64ToHex(res.r_hash),
    backend: 'lnd',
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVOICE_EXPIRY_SEC * 1000).toISOString(),
  };
  return createInvoice(invoice);
}

/**
 * Asks LND for the invoice's real state and caches it. Paid status ONLY comes from here.
 * If LND is unreachable, returns the cached status with live=false and a friendly error.
 */
export async function refreshStatus(inv: Invoice): Promise<StatusResponse> {
  if (inv.backend !== 'lnd' || FINAL_STATUSES.includes(inv.status)) {
    return { status: inv.status, settledAt: inv.settledAt, amountPaidSat: inv.amountPaidSat, live: false };
  }
  try {
    const mapped = mapLndInvoice(await lookupInvoice(inv.rHashHex));
    const updated = (await updateInvoice(inv.id, mapped)) ?? inv;
    return { status: updated.status, settledAt: updated.settledAt, amountPaidSat: updated.amountPaidSat, live: true };
  } catch (e) {
    console.error(`[lnd] lookupinvoice ${inv.id} failed:`, (e as Error).message);
    return { status: cachedStatus(inv), live: false, error: friendlyLndError(e).message };
  }
}

/** Public-safe view of an invoice (nothing secret is stored, but keep the surface explicit). */
export function publicInvoice(inv: Invoice) {
  const { clientEmail: _omit, ...rest } = inv;
  return rest;
}
