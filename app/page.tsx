import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { NodeStatusCard } from '@/components/NodeStatusCard';

const STEPS = [
  { n: 1, title: 'Create', body: 'Enter your client, the job and the amount in sats. Your own Lightning node creates a real invoice.' },
  { n: 2, title: 'Share', body: 'Send your client the link. They scan the QR code with any Lightning wallet.' },
  { n: 3, title: 'Get paid', body: 'Payment lands in seconds. Your node confirms it and the invoice turns green — with a receipt.' },
];

export default async function Home() {
  await connection();
  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col items-start gap-6 pt-4">
        <span className="rounded-full bg-btc-soft px-3 py-1 text-xs font-semibold text-btc-dark">⚡ Bitcoin Lightning invoices for freelancers</span>
        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Get paid in Bitcoin <span className="text-btc">in seconds.</span>
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          No bank, no 5-day wait, no 10% fee. Send a link, your client pays with any Lightning wallet, and your own node verifies it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/new" className="btn-primary px-6 py-3 text-base">
            Create invoice
          </Link>
          <a href="/wallet" className="btn-secondary px-6 py-3 text-base">
            Try the browser wallet (signet)
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-btc-soft text-sm font-bold text-btc-dark">{s.n}</span>
            <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Your Lightning node</h2>
        <Suspense fallback={<div className="card p-5 text-sm text-slate-400">Checking your Lightning node…</div>}>
          <NodeStatusCard />
        </Suspense>
      </section>
    </div>
  );
}
