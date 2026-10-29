import type { Entry } from '@lightninglabs/wavelength-core';
import type { InvoiceStatus } from '@/lib/types';

/** Finds the receive entry for an invoice in the wallet's activity stream. */
export function findReceiveEntry(activity: readonly Entry[], entryId: string, bolt11: string) {
  return activity.find(
    (e) => e.kind === 'receive' && (e.id === entryId || e.request?.lightningInvoice === bolt11),
  );
}

/**
 * Maps a Wavelength activity entry to our InvoiceStatus.
 * 'complete' = the receive swap settled into the wallet → paid.
 */
export function mapEntry(entry: Entry): InvoiceStatus {
  if (entry.status === 'complete') return 'paid';
  if (entry.status === 'failed')
    return entry.failureCode === 'expired' || entry.failureCode === 'timed_out' ? 'expired' : 'canceled';
  const phase = entry.progress?.phase;
  return phase === 'payment_detected' || phase === 'settling' ? 'processing' : 'pending';
}
