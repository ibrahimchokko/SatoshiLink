import Link from 'next/link';
import { ReceiptCard } from '@/components/ReceiptCard';
import { StatusBadge } from '@/components/StatusBadge';
import { loadInvoiceForPage } from '@/lib/load';

export const metadata = { title: 'Receipt — SatoshiLink' };

const FREELANCER = process.env.FREELANCER_NAME || 'Amina';

export default async function ReceiptPage({ params }: PageProps<'/receipt/[id]'>) {
  const { invoice: inv, nodeError } = await loadInvoiceForPage(params);

  if (inv.status !== 'paid') {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <StatusBadge status={inv.status} />
        <h1 className="text-xl font-bold text-slate-900">Not paid yet</h1>
        <p className="text-sm text-slate-600">
          A receipt is only available once the Lightning node confirms the payment.
          {nodeError && <span className="mt-2 block text-amber-700">{nodeError}</span>}
        </p>
        <Link href={`/pay/${inv.id}`} className="btn-primary">
          Go to payment page
        </Link>
      </div>
    );
  }

  return <ReceiptCard inv={inv} freelancer={FREELANCER} />;
}
