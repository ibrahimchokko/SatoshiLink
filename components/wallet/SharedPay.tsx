'use client';

import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { QRBlock } from '@/components/QRBlock';
import { formatSats } from '@/lib/format';
import { decodeShared, type SharedInvoice } from '@/lib/wavelength/share';

/** Client pay page for browser-wallet invoices. The invoice travels in the URL fragment. */
export function SharedPay() {
  const [inv, setInv] = useState<SharedInvoice | null | undefined>(undefined);
  useEffect(() => {
    const read = () => setInv(decodeShared(window.location.hash));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  if (inv === undefined) return <div className="card mx-auto max-w-md p-10 text-center text-sm text-slate-400">Loading invoice…</div>;
  if (inv === null)
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="font-semibold text-slate-900">This payment link is incomplete</p>
        <p className="mt-1 text-sm text-slate-500">Ask the freelancer to copy the share link again.</p>
      </div>
    );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">{inv.f || 'Your freelancer'}</span> is requesting
        </p>
        <p className="mt-2 text-4xl font-extrabold text-slate-900">{formatSats(inv.a)}</p>
        <p className="mt-2 text-slate-600">
          for <span className="font-medium text-slate-800">{inv.d}</span>
        </p>
        {inv.c && <p className="mt-1 text-sm text-slate-400">Billed to {inv.c}</p>}
      </div>
      <div className="card flex flex-col gap-5 p-6">
        <QRBlock paymentRequest={inv.i} />
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Lightning invoice (signet)</p>
          <p className="font-mono text-xs break-all text-slate-700">{inv.i}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a href={`lightning:${inv.i}`} className="btn-primary">
            Open in wallet ⚡
          </a>
          <CopyButton value={inv.i} label="Copy invoice" />
        </div>
      </div>
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
        This invoice was made by the freelancer’s <strong>browser wallet</strong> (Wavelength, signet test network). Their
        wallet confirms the payment, so this page can’t show live status. Your wallet will say when it’s sent.
      </p>
    </div>
  );
}
