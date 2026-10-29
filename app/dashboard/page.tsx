import Link from 'next/link';
import { connection } from 'next/server';
import { AutoRefresh } from '@/components/AutoRefresh';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatSats } from '@/lib/format';
import { refreshStatus } from '@/lib/service';
import { listInvoices } from '@/lib/store';
import type { Invoice } from '@/lib/types';

export const metadata = { title: 'Dashboard — SatoshiLink' };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'waiting', label: 'Waiting' },
] as const;

export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  await connection();
  const { filter: rawFilter } = await searchParams;
  const filter = FILTERS.some((f) => f.key === rawFilter) ? (rawFilter as string) : 'all';

  // Refresh open invoices from LND so the dashboard reflects the node's truth.
  const stored = await listInvoices();
  let nodeError: string | undefined;
  const invoices: Invoice[] = await Promise.all(
    stored.map(async (inv) => {
      if (inv.status !== 'pending' && inv.status !== 'processing') return inv;
      const s = await refreshStatus(inv);
      nodeError ??= s.error;
      return { ...inv, status: s.status, settledAt: s.settledAt, amountPaidSat: s.amountPaidSat };
    }),
  );

  const paid = invoices.filter((i) => i.status === 'paid');
  const waiting = invoices.filter((i) => i.status === 'pending' || i.status === 'processing');
  const received = paid.reduce((sum, i) => sum + (i.amountPaidSat ?? i.amountSat), 0);
  const outstanding = waiting.reduce((sum, i) => sum + i.amountSat, 0);

  const shown = filter === 'paid' ? paid : filter === 'waiting' ? waiting : invoices;

  return (
    <div className="flex flex-col gap-6">
      {waiting.length > 0 && <AutoRefresh />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">Every status here comes from your Lightning node.</p>
        </div>
        <Link href="/new" className="btn-primary">
          + New invoice
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Received" value={formatSats(received)} accent />
        <Stat label="Outstanding" value={formatSats(outstanding)} />
        <Stat label="Paid invoices" value={String(paid.length)} />
        <Stat label="Waiting" value={String(waiting.length)} />
      </div>

      {nodeError && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{nodeError} Showing last known statuses.</p>}

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/dashboard' : `/dashboard?filter=${f.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="font-semibold text-slate-900">{invoices.length === 0 ? 'No invoices yet' : 'Nothing here'}</p>
          <p className="text-sm text-slate-500">
            {invoices.length === 0 ? 'Create your first Lightning invoice — it takes 10 seconds.' : 'No invoices match this filter.'}
          </p>
          {invoices.length === 0 && (
            <Link href="/new" className="btn-primary">
              Create invoice
            </Link>
          )}
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {shown.map((inv) => (
            <li key={inv.id}>
              <Link href={`/invoice/${inv.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {inv.clientName} <span className="font-normal text-slate-500">· {inv.description}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(inv.createdAt)} · #{inv.id}
                  </p>
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
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? 'border-btc/40 bg-btc-soft' : ''}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent ? 'text-btc-dark' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
