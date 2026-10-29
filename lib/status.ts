import type { LndInvoice } from './lnd';
import type { Invoice, InvoiceStatus } from './types';

export interface MappedStatus {
  status: InvoiceStatus;
  settledAt?: string;
  amountPaidSat?: number;
}

/**
 * Maps LND invoice state + expiry to our InvoiceStatus.
 * LND auto-cancels invoices once they expire, so CANCELED past expiry is shown as "expired";
 * CANCELED before expiry means someone actively canceled it.
 */
export function mapLndInvoice(inv: LndInvoice, now = Date.now()): MappedStatus {
  const created = Number(inv.creation_date ?? 0);
  const expiry = Number(inv.expiry ?? 3600);
  const expired = created > 0 && now / 1000 > created + expiry;

  switch (inv.state) {
    case 'SETTLED': {
      const settle = Number(inv.settle_date ?? 0);
      return {
        status: 'paid',
        settledAt: settle > 0 ? new Date(settle * 1000).toISOString() : undefined,
        amountPaidSat: Number(inv.amt_paid_sat ?? 0) || undefined,
      };
    }
    case 'ACCEPTED':
      return { status: 'processing' };
    case 'CANCELED':
      return { status: expired ? 'expired' : 'canceled' };
    case 'OPEN':
    default:
      return { status: expired ? 'expired' : 'pending' };
  }
}

/** Fallback when LND is unreachable: an unpaid cached invoice past its expiry is expired. */
export function cachedStatus(inv: Invoice, now = Date.now()): InvoiceStatus {
  if (inv.status === 'pending' && now > Date.parse(inv.expiresAt)) return 'expired';
  return inv.status;
}
