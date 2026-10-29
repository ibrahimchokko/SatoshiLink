'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { QRBlock } from '@/components/QRBlock';
import { ReceiptCard } from '@/components/ReceiptCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatSats } from '@/lib/format';
import { encodeShared } from '@/lib/wavelength/share';
import { useWalletInvoices } from './useWalletInvoices';

const FREELANCER = process.env.NEXT_PUBLIC_FREELANCER_NAME || 'Amina';

export function WalletInvoiceView({ id }: { id: string }) {
  const invoices = useWalletInvoices();
  const inv = invoices.find((i) => i.id === id);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  if (!inv) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="font-semibold text-slate-900">Invoice not found in this browser</p>
        <p className="mt-1 text-sm text-slate-500">Browser-wallet invoices are stored only in the browser that created them.</p>
        <Link href="/wallet" className="btn-secondary mt-4">
          Back to wallet
        </Link>
      </div>
    );
  }

  if (inv.status === 'paid') {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/wallet" className="no-print text-sm text-slate-500 hover:text-slate-800">
          ← Wallet
        </Link>
        <ReceiptCard inv={inv} freelancer={FREELANCER} />
      </div>
    );
  }

  const open = inv.status === 'pending' || inv.status === 'processing';
  const shareUrl = `${origin}/w/pay#${encodeShared({ v: 1, i: inv.paymentRequest, a: inv.amountSat, d: inv.description, c: inv.clientName, f: FREELANCER })}`;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="flex flex-col gap-4 lg:col-span-2">
        <Link href="/wallet" className="text-sm text-slate-500 hover:text-slate-800">
          ← Wallet
        </Link>
        <div className="card p-6">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Invoice #{inv.id}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatSats(inv.amountSat)}</p>
          <p className="mt-2 text-slate-600">
            {inv.clientName} · {inv.description}
          </p>
          <p className="mt-1 text-xs text-slate-400">Created {formatDate(inv.createdAt)} · Wavelength (signet)</p>
        </div>
      </section>
      <section className="card flex flex-col gap-5 p-6 lg:col-span-3">
        <StatusBadge status={inv.status} />
        <QRBlock paymentRequest={inv.paymentRequest} dimmed={!open} />
        {open ? (
          <>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium text-slate-500">Lightning invoice</p>
              <p className="font-mono text-xs break-all text-slate-700">{inv.paymentRequest}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <CopyButton value={shareUrl} label="Copy share link" className="btn-primary" />
              <CopyButton value={inv.paymentRequest} label="Copy invoice" />
            </div>
            <p className="text-center text-xs text-slate-400">
              Keep this tab open: your browser wallet completes the payment and this page turns green by itself.
            </p>
          </>
        ) : (
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
            {inv.status === 'expired' ? 'This invoice expired before it was paid.' : 'This invoice failed.'} Create a new one to
            request payment again.
          </p>
        )}
      </section>
    </div>
  );
}
