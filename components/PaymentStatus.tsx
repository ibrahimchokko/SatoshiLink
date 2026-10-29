'use client';

import { useEffect, useState } from 'react';
import { FINAL_STATUSES, type InvoiceStatus, type StatusResponse } from '@/lib/types';

const POLL_MS = 2500;

/** Polls our status API (which asks LND) until the invoice reaches a final state. */
export function usePaymentStatus(id: string, initial: InvoiceStatus) {
  const [state, setState] = useState<StatusResponse>({ status: initial, live: false });

  useEffect(() => {
    if (FINAL_STATUSES.includes(initial)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`/api/invoices/${id}/status`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as StatusResponse;
          if (stopped) return;
          setState(data);
          if (FINAL_STATUSES.includes(data.status)) return;
        }
      } catch {
        if (!stopped) setState((s) => ({ ...s, live: false, error: 'Lost connection to the app server — retrying…' }));
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    }

    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, initial]);

  return state;
}
