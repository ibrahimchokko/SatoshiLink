'use client';

import { useWalletActivity } from '@lightninglabs/wavelength-react';
import { useEffect, useMemo, useState } from 'react';
import { loadWalletInvoices, onWalletInvoicesChange, updateWalletInvoice, type WalletInvoice } from '@/lib/wavelength/local';
import { findReceiveEntry, mapEntry } from '@/lib/wavelength/status';

/**
 * Stored browser-wallet invoices merged with their live status from the wallet's activity stream.
 * Paid status only comes from the wallet (entry status 'complete'), never from a button.
 */
export function useWalletInvoices(): WalletInvoice[] {
  const activity = useWalletActivity();
  const [stored, setStored] = useState<WalletInvoice[]>([]);

  useEffect(() => {
    const load = () => setStored(loadWalletInvoices());
    load();
    return onWalletInvoicesChange(load);
  }, []);

  const merged = useMemo(
    () =>
      stored.map((inv) => {
        const entry = findReceiveEntry(activity, inv.entryId, inv.paymentRequest);
        if (!entry) return inv;
        const status = mapEntry(entry);
        return {
          ...inv,
          status,
          rHashHex: inv.rHashHex || entry.progress?.paymentHash || entry.request?.paymentHash || '',
          settledAt: status === 'paid' ? (inv.settledAt ?? entry.updatedAt) : inv.settledAt,
          amountPaidSat: status === 'paid' ? Math.abs(entry.amountSat) || inv.amountSat : inv.amountPaidSat,
        };
      }),
    [stored, activity],
  );

  // Cache the latest status so the list shows it even before the activity stream loads next time.
  useEffect(() => {
    for (const inv of merged) {
      const prev = stored.find((s) => s.id === inv.id);
      if (prev && (prev.status !== inv.status || prev.rHashHex !== inv.rHashHex)) {
        updateWalletInvoice(inv.id, {
          status: inv.status,
          rHashHex: inv.rHashHex,
          settledAt: inv.settledAt,
          amountPaidSat: inv.amountPaidSat,
        });
      }
    }
  }, [merged, stored]);

  return merged;
}
