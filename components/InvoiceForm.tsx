'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatSats } from '@/lib/format';
import { MAX_SATS } from '@/lib/validation';

type Fields = { clientName: string; clientEmail: string; description: string; amountSat: string };

export function InvoiceForm() {
  const router = useRouter();
  const [f, setF] = useState<Fields>({ clientName: '', clientEmail: '', description: '', amountSat: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
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
        setFormError(data.fields ? '' : data.error ?? 'Something went wrong.');
        return;
      }
      router.push(`/invoice/${data.invoice.id}`);
    } catch {
      setFormError('Could not reach the app server. Is `npm run dev` running?');
    } finally {
      setSubmitting(false);
    }
  }

  const amount = /^\d+$/.test(f.amountSat) ? Number(f.amountSat) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={onSubmit} noValidate className="card flex flex-col gap-4 p-6 lg:col-span-3">
        <Field label="Client name" error={errors.clientName}>
          <input className="input" value={f.clientName} onChange={set('clientName')} placeholder="Hans Müller" maxLength={60} />
        </Field>
        <Field label="Client email (optional, for your records)" error={errors.clientEmail}>
          <input className="input" type="email" value={f.clientEmail} onChange={set('clientEmail')} placeholder="hans@example.com" />
        </Field>
        <Field label="What is this payment for?" error={errors.description}>
          <textarea className="input min-h-20" value={f.description} onChange={set('description')} placeholder="Logo design" maxLength={200} />
        </Field>
        <Field label="Amount (sats)" error={errors.amountSat} hint={`1 – ${MAX_SATS.toLocaleString('en-US')} sats`}>
          <input className="input" inputMode="numeric" value={f.amountSat} onChange={set('amountSat')} placeholder="5000" />
        </Field>
        {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
        <button type="submit" disabled={submitting} className="btn-primary mt-2">
          {submitting ? 'Creating invoice on your node…' : 'Create Lightning invoice'}
        </button>
      </form>

      <aside className="lg:col-span-2">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Preview — what your client sees</p>
        <div className="card p-6">
          <p className="text-sm text-slate-500">
            Requesting payment from <span className="font-semibold text-slate-800">{f.clientName || 'your client'}</span>
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{amount ? formatSats(amount) : '— sats'}</p>
          <p className="mt-2 text-slate-600">{f.description || 'Service description'}</p>
          <div className="mt-5 flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400">
            QR code appears after you create it
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-sm text-red-600">{error}</span> : hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
