import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <h1 className="text-xl font-bold text-slate-900">Invoice not found</h1>
      <p className="text-sm text-slate-500">This link doesn’t match any invoice. Double-check the link you were sent.</p>
      <Link href="/" className="btn-secondary">
        Go home
      </Link>
    </div>
  );
}
