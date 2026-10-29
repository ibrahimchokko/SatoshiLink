import 'server-only';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { refreshStatus } from './service';
import { getInvoice } from './store';
import type { Invoice } from './types';
import { idSchema } from './validation';

/** Loads an invoice for a page and refreshes its status from LND (falls back to cache if LND is offline). */
export async function loadInvoiceForPage(params: Promise<{ id: string }>): Promise<{ invoice: Invoice; nodeError?: string }> {
  await connection();
  const { id } = await params;
  const inv = idSchema.safeParse(id).success ? await getInvoice(id) : undefined;
  if (!inv) notFound();
  const s = await refreshStatus(inv);
  return {
    invoice: { ...inv, status: s.status, settledAt: s.settledAt ?? inv.settledAt, amountPaidSat: s.amountPaidSat ?? inv.amountPaidSat },
    nodeError: s.error,
  };
}
