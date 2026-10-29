import { InvoiceForm } from '@/components/InvoiceForm';

export const metadata = { title: 'New invoice — SatoshiLink' };

export default function NewInvoicePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">New invoice</h1>
        <p className="mt-1 text-slate-600">Your Lightning node creates a real invoice. Your client pays it with any Lightning wallet.</p>
      </div>
      <InvoiceForm />
    </div>
  );
}
