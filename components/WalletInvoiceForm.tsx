'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MAX_SATS } from '@/lib/validation';

type Fields = { clientName: string; description: string; amountSat: string };

/** Compact "New invoice" form for the wallet page. Creates the invoice on the LND node via our API. */
export function WalletInvoiceForm() {
  const router = useRouter();
  const [f, setF] = useState<Fields>({ clientName: '', description: '', amountSat: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.fields ? '' : (data.error ?? 'Something went wrong.'));
        return;
      }
      router.push(`/invoice/${data.invoice.id}`);
    } catch {
      setFormError('Could not reach the app server. Is `npm run dev` running?');
    } finally {
      setSubmitting(false);
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
      <button className="btn-primary" disabled={submitting}>
        {submitting ? 'Creating invoice on your node…' : 'Create Lightning invoice'}
      </button>
    </form>
  );
}
