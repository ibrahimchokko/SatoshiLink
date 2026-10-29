import type { InvoiceStatus } from '@/lib/types';

const STYLES: Record<InvoiceStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: 'Waiting for payment', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500 animate-pulse' },
  processing: { label: 'Processing', cls: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500 animate-pulse' },
  paid: { label: 'Paid ✓', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  expired: { label: 'Expired', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  canceled: { label: 'Canceled', cls: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

export function StatusBadge({ status, short }: { status: InvoiceStatus; short?: boolean }) {
  const s = STYLES[status];
  const label = short && status === 'pending' ? 'Waiting' : s.label;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>
      {status !== 'paid' && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {label}
    </span>
  );
}
