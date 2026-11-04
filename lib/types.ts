export type InvoiceStatus = 'pending' | 'paid' | 'expired' | 'canceled' | 'processing';

export interface Invoice {
  id: string; // short slug used in URLs
  clientName: string;
  clientEmail?: string;
  description: string;
  amountSat: number;
  memo: string; // `${clientName} – ${description}` (max ~100 chars)
  paymentRequest: string; // BOLT11
  rHashHex: string; // payment hash (hex) — used for lookup
  backend: 'lnd' | 'wavelength';
  status: InvoiceStatus; // cached; source of truth is LND
  createdAt: string; // ISO
  expiresAt: string; // ISO
  settledAt?: string; // ISO, from LND settle_date
  amountPaidSat?: number; // from LND amt_paid_sat
}

export const FINAL_STATUSES: InvoiceStatus[] = ['paid', 'expired', 'canceled'];

/** Money sent out of the freelancer's node to an external wallet. */
export interface Withdrawal {
  id: string;
  method: 'lightning' | 'onchain';
  destination: string; // BOLT11 invoice or bitcoin address
  amountSat: number;
  feeSat?: number;
  /** lightning: final as soon as LND says SUCCEEDED. onchain: 'pending' until the tx has 1 confirmation. */
  status: 'pending' | 'complete';
  reference: string; // payment hash (lightning) or txid (onchain)
  memo?: string; // description from the invoice, if any
  createdAt: string; // ISO
  completedAt?: string; // ISO
}

export interface NodeInfo {
  alias: string;
  pubkey: string;
  network: string;
  synced: boolean;
  activeChannels: number;
  blockHeight: number;
  version: string;
}

export interface NodeBalance {
  lightningSat: number; // spendable over channels
  pendingLightningSat: number; // in channels still opening
  onchainSat: number; // confirmed on-chain
  unconfirmedOnchainSat: number;
}

/** Shape returned by GET /api/invoices/[id]/status */
export interface StatusResponse {
  status: InvoiceStatus;
  settledAt?: string;
  amountPaidSat?: number;
  /** true when the status came from LND just now; false when LND was unreachable and we returned the cached value */
  live: boolean;
  error?: string;
}
