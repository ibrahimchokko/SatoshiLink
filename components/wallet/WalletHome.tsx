'use client';

import { useWalletBalance, useWalletReceive } from '@lightninglabs/wavelength-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatSats, truncate } from '@/lib/format';
import { addWalletInvoice } from '@/lib/wavelength/local';
import { createInvoiceSchema, fieldErrors, MAX_SATS } from '@/lib/validation';
import { useWalletInvoices } from './useWalletInvoices';

type Fields = { clientName: string; description: string; amountSat: string };

export function WalletHome() {
  const balance = useWalletBalance();
  const invoices = useWalletInvoices();
  const received = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.amountPaidSat ?? i.amountSat), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="card border-btc/40 bg-btc-soft p-5">
          <p className="text-xs font-medium text-slate-500">Wallet balance (signet)</p>
          <p className="mt-1 text-2xl font-bold text-btc-dark">{balance ? formatSats(balance.confirmedSat) : '…'}</p>
          {balance && balance.pendingInSat > 0 && (
            <p className="mt-1 text-xs text-slate-600">+{formatSats(balance.pendingInSat)} incoming</p>
          )}
          <p className="mt-3 text-xs text-slate-500">Received via SatoshiLink: {formatSats(received)}</p>
        </div>
        <NewWalletInvoice />
      </div>

      <section className="lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Browser-wallet invoices</h2>
        {invoices.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">No invoices yet. Create one on the left.</div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/wallet/invoice/${inv.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {inv.clientName} <span className="font-normal text-slate-500">· {inv.description}</span>
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(inv.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-semibold text-slate-900">{formatSats(inv.amountSat)}</span>
                    <StatusBadge status={inv.status} short />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Plain-English message for the UI; the raw error is logged to the console. */
function friendlyReceiveError(err: Error) {
  const msg = err.message ?? '';
  if (/ARK_VERSION_MISMATCH/.test(msg))
    return 'The public signet payment server is running a different protocol version than this wallet, so it can’t create invoices right now. This is on the Wavelength side — try again later.';
  if (/fetch|network|unavailable|deadline|timeout/i.test(msg))
    return 'Couldn’t reach the Wavelength signet servers. Check your internet connection and try again.';
  return `Couldn’t create the invoice: ${msg}`;
}

function NewWalletInvoice() {
  const router = useRouter();
  const { receive, receivePending } = useWalletReceive();
  const [f, setF] = useState<Fields>({ clientName: '', description: '', amountSat: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const parsed = createInvoiceSchema.safeParse(f);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    const { clientName, description, amountSat } = parsed.data;
    const memo = truncate(`${clientName} – ${description}`, 100);
    try {
      const res = await receive({ amountSat, memo });
      const now = new Date();
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      addWalletInvoice({
        id,
        clientName,
        description,
        amountSat,
        memo,
        paymentRequest: res.invoice,
        rHashHex: res.entry.progress?.paymentHash || res.entry.request?.paymentHash || '',
        entryId: res.entry.id,
        backend: 'wavelength',
        status: 'pending',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 3600_000).toISOString(),
      });
      router.push(`/wallet/invoice/${id}`);
    } catch (err) {
      console.error('[wavelength] receive failed', err);
      setFormError(friendlyReceiveError(err as Error));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card flex flex-col gap-3 p-5">
      <h2 className="font-semibold text-slate-900">New invoice</h2>
      <input className="input" placeholder="Client name (e.g. Hans)" value={f.clientName} onChange={set('clientName')} maxLength={60} />
      {errors.clientName && <p className="text-sm text-red-600">{errors.clientName}</p>}
      <input className="input" placeholder="What is it for? (e.g. Logo design)" value={f.description} onChange={set('description')} maxLength={200} />
      {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
      <input className="input" inputMode="numeric" placeholder={`Amount in sats (max ${MAX_SATS.toLocaleString('en-US')})`} value={f.amountSat} onChange={set('amountSat')} />
      {errors.amountSat && <p className="text-sm text-red-600">{errors.amountSat}</p>}
      {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      <button className="btn-primary" disabled={receivePending}>
        {receivePending ? 'Creating invoice…' : 'Create Lightning invoice'}
      </button>
    </form>
  );
}
