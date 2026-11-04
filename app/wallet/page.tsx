import Link from 'next/link';
import { connection } from 'next/server';
import { AutoRefresh } from '@/components/AutoRefresh';
import { StatusBadge } from '@/components/StatusBadge';
import { WalletInvoiceForm } from '@/components/WalletInvoiceForm';
import { WithdrawForm } from '@/components/WithdrawForm';
import { formatDate, formatSats, shortHash } from '@/lib/format';
import { fetchBalance, fetchNodeInfo, invoiceTotals, listInvoicesLive } from '@/lib/service';
import type { Withdrawal } from '@/lib/types';
import { listWithdrawalsLive } from '@/lib/withdraw';

export const metadata = { title: 'Wallet — SatoshiLink' };

/** The freelancer's main wallet = their own LND node (regtest). Same invoices and totals as the dashboard. */
export default async function WalletPage() {
  await connection();
  const [wallet, node, { invoices, nodeError }, withdrawals] = await Promise.all([
    fetchBalance(),
    fetchNodeInfo(),
    listInvoicesLive(),
    listWithdrawalsLive(),
  ]);
  const { waiting, received, outstanding } = invoiceTotals(invoices);
  const withdrawn = withdrawals.reduce((sum, w) => sum + w.amountSat, 0);
  const confirming = withdrawals.some((w) => w.status === 'pending');
  const network = node.ok ? node.node.network : 'regtest';

  return (
    <div className="flex flex-col gap-6">
      {/* Keep polling while invoices are open or a withdrawal is confirming, so the balance updates by itself. */}
      {(waiting.length > 0 || confirming) && <AutoRefresh everyMs={3000} />}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-btc-soft px-4 py-2 text-xs text-btc-dark">
        <span>
          <strong>Lightning wallet</strong> · LND node {node.ok ? <strong>{node.node.alias}</strong> : null} · {network} test network — coins
          have no value
        </span>
        <span className="text-btc-dark/70">Every balance and status comes from your node</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="card border-btc/40 bg-btc-soft p-5">
            <p className="text-xs font-medium text-slate-500">Wallet balance ({network})</p>
            {wallet.ok ? (
              <>
                <p className="mt-1 text-2xl font-bold text-btc-dark">{formatSats(wallet.balance.lightningSat)}</p>
                {wallet.balance.pendingLightningSat > 0 && (
                  <p className="mt-1 text-xs text-slate-600">+{formatSats(wallet.balance.pendingLightningSat)} in channels still opening</p>
                )}
                <p className="mt-1 text-xs text-slate-600">On-chain: {formatSats(wallet.balance.onchainSat)}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-red-700">{wallet.error}</p>
            )}
            <p className="mt-3 text-xs text-slate-500">Received via SatoshiLink: {formatSats(received)}</p>
            {outstanding > 0 && <p className="mt-0.5 text-xs text-slate-500">Waiting for: {formatSats(outstanding)}</p>}
            {withdrawn > 0 && <p className="mt-0.5 text-xs text-slate-500">Withdrawn: {formatSats(withdrawn)}</p>}
            <Link href="/dashboard" className="mt-3 inline-block text-xs font-medium text-btc-dark hover:underline">
              Same numbers as your dashboard →
            </Link>
          </div>
          <WalletInvoiceForm />
          <WithdrawForm />
        </div>

        <section className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Invoices</h2>
          {nodeError && <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{nodeError} Showing last known statuses.</p>}
          {invoices.length === 0 ? (
            <div className="card p-8 text-center text-sm text-slate-500">No invoices yet. Create one on the left.</div>
          ) : (
            <ul className="card divide-y divide-slate-100">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={inv.status === 'paid' ? `/receipt/${inv.id}` : `/invoice/${inv.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {inv.clientName} <span className="font-normal text-slate-500">· {inv.description}</span>
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(inv.settledAt ?? inv.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`font-semibold ${inv.status === 'paid' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {inv.status === 'paid' ? '+' : ''}
                        {formatSats(inv.amountPaidSat ?? inv.amountSat)}
                      </span>
                      <StatusBadge status={inv.status} short />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {withdrawals.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Withdrawals</h2>
              <ul className="card divide-y divide-slate-100">
                {withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {w.method === 'lightning' ? '⚡ Lightning' : '⛓ On-chain'}{' '}
                        <span className="font-normal text-slate-500">· {w.memo ?? shortHash(w.destination, 10)}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(w.completedAt ?? w.createdAt)}
                        {w.feeSat !== undefined && ` · fee ${formatSats(w.feeSat)}`} ·{' '}
                        <span className="font-mono" title={w.method === 'lightning' ? 'Payment hash' : 'Transaction id'}>
                          {shortHash(w.reference)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-semibold text-slate-900">−{formatSats(w.amountSat)}</span>
                      <WithdrawalBadge status={w.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Want a wallet with no node?{' '}
            {/* Plain <a>: the browser wallet needs a full page load to get its cross-origin isolation headers. */}
            <a href="/wallet/browser" className="font-medium text-slate-500 hover:underline">
              Try the browser wallet (signet, alpha)
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

function WithdrawalBadge({ status }: { status: Withdrawal['status'] }) {
  return status === 'complete' ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset">
      Sent ✓
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      Confirming
    </span>
  );
}
