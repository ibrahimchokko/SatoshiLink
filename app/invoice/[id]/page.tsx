
import Link from 'next/link';
import { InvoiceLive } from '@/components/InvoiceLive';
import { formatDate, formatSats } from '@/lib/format';
import { loadInvoiceForPage } from '@/lib/load';

export const metadata = { title: 'Invoice — SatoshiLink' };

export default async function InvoicePage({ params }: PageProps<'/invoice/[id]'>) {
  const { invoice: inv } = await loadInvoiceForPage(params);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="flex flex-col gap-4 lg:col-span-2">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          ← All invoices
        </Link>
        <div className="card p-6">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Invoice #{inv.id}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{formatSats(inv.amountSat)}</p>
          <dl className="mt-5 flex flex-col gap-3 text-sm">
            <Row k="Client" v={inv.clientName} />
            {inv.clientEmail && <Row k="Email" v={inv.clientEmail} />}
            <Row k="For" v={inv.description} />
            <Row k="Created" v={formatDate(inv.createdAt)} />
            <Row k="Node" v="LND (regtest)" />
          </dl>
        </div>
      </section>
      <section className="card p-6 lg:col-span-3">
        <InvoiceLive
          id={inv.id}
          paymentRequest={inv.paymentRequest}
          amountSat={inv.amountSat}
          initialStatus={inv.status}
          expiresAt={inv.expiresAt}
          variant="freelancer"
        />
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium break-words text-slate-800">{v}</dd>
    </div>
  );
}
