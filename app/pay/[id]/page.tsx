import { InvoiceLive } from '@/components/InvoiceLive';
import { formatSats } from '@/lib/format';
import { loadInvoiceForPage } from '@/lib/load';

export const metadata = { title: 'Pay invoice — SatoshiLink' };

const FREELANCER = process.env.FREELANCER_NAME || 'Amina';

export default async function PayPage({ params }: PageProps<'/pay/[id]'>) {
  const { invoice: inv } = await loadInvoiceForPage(params);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <p className="text-slate-600">
          <span className="font-semibold text-slate-900">{FREELANCER}</span> is requesting
        </p>
        <p className="mt-2 text-4xl font-extrabold text-slate-900">{formatSats(inv.amountSat)}</p>
        <p className="mt-2 text-slate-600">
          for <span className="font-medium text-slate-800">{inv.description}</span>
        </p>
        <p className="mt-1 text-sm text-slate-400">Billed to {inv.clientName}</p>
      </div>
      <div className="card p-6">
        <InvoiceLive
          id={inv.id}
          paymentRequest={inv.paymentRequest}
          amountSat={inv.amountSat}
          initialStatus={inv.status}
          expiresAt={inv.expiresAt}
          variant="client"
        />
      </div>
      <p className="text-center text-xs text-slate-400">
        Scan with any Lightning wallet. Payment is verified directly by the freelancer’s Lightning node.
      </p>
    </div>
  );
}
