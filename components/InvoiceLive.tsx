'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CopyButton } from './CopyButton';
import { QRBlock } from './QRBlock';
import { StatusBadge } from './StatusBadge';
import { usePaymentStatus } from './PaymentStatus';
import { formatDate, formatSats } from '@/lib/format';
import type { InvoiceStatus } from '@/lib/types';

interface Props {
  id: string;
  paymentRequest: string;
  amountSat: number;
  initialStatus: InvoiceStatus;
  expiresAt: string;
  variant: 'freelancer' | 'client';
}

/** QR + copy actions + live status. Used on both the freelancer's invoice page and the client's pay page. */
export function InvoiceLive({ id, paymentRequest, amountSat, initialStatus, expiresAt, variant }: Props) {
  const { status, settledAt, amountPaidSat, error } = usePaymentStatus(id, initialStatus);
  const [shareUrl, setShareUrl] = useState(`/pay/${id}`);
  useEffect(() => setShareUrl(`${window.location.origin}/pay/${id}`), [id]);

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
        <div>
          <p className="text-xl font-bold text-slate-900">{variant === 'client' ? 'Payment received ✓' : 'Paid ✓'}</p>
          <p className="mt-1 text-sm text-slate-500" suppressHydrationWarning>
            {formatSats(amountPaidSat ?? amountSat)} · {formatDate(settledAt)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Verified by the Lightning node (invoice state: SETTLED)</p>
        </div>
        <Link href={`/receipt/${id}`} className="btn-primary">
          View receipt
        </Link>
      </div>
    );
  }

  const open = status === 'pending' || status === 'processing';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        {open && <span className="text-xs text-slate-400" suppressHydrationWarning>
            Expires {formatDate(expiresAt)}
          </span>}
      </div>

      <QRBlock paymentRequest={paymentRequest} dimmed={!open} />

      {!open && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
          {status === 'expired' ? 'This invoice expired before it was paid.' : 'This invoice was canceled.'}
          {variant === 'freelancer' && ' Create a new one to request payment again.'}
        </p>
      )}

      {open && (
        <>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium text-slate-500">Lightning invoice</p>
            <p className="font-mono text-xs break-all text-slate-700">{paymentRequest}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {variant === 'client' ? (
              <a href={`lightning:${paymentRequest}`} className="btn-primary">
                Open in wallet ⚡
              </a>
            ) : (
              <CopyButton value={shareUrl} label="Copy share link" className="btn-primary" />
            )}
            <CopyButton value={paymentRequest} label="Copy invoice" />
          </div>
          {variant === 'freelancer' && (
            <p className="text-center text-xs text-slate-500">
              Send the share link to your client:{' '}
              <Link href={`/pay/${id}`} target="_blank" className="font-medium text-btc-dark underline">
                {shareUrl}
              </Link>
            </p>
          )}
          <p className="text-center text-xs text-slate-400">
            Checking the Lightning node every few seconds — this page updates by itself.
          </p>
        </>
      )}

      {error && <p className="rounded-xl bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">{error}</p>}
    </div>
  );
}
