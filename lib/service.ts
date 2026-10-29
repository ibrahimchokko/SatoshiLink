import 'server-only';
import { randomUUID } from 'node:crypto';
import { addInvoice, b64ToHex, friendlyLndError, getInfo, lookupInvoice } from './lnd';
import { cachedStatus, mapLndInvoice } from './status';
import { createInvoice, updateInvoice } from './store';
import { FINAL_STATUSES, type Invoice, type NodeInfo, type StatusResponse } from './types';
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
