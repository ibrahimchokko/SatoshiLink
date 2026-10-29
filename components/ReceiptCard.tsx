import { CopyButton } from './CopyButton';
import { PrintButton } from './PrintButton';
import { formatDate, formatSats, shortHash } from '@/lib/format';
import type { Invoice } from '@/lib/types';

export function ReceiptCard({ inv, freelancer }: { inv: Invoice; freelancer: string }) {
  return (
    <div className="card mx-auto max-w-lg p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Payment receipt</p>
          <p className="mt-1 text-sm text-slate-400">#{inv.id}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Paid ✓</span>
      </div>

      <p className="mt-6 text-4xl font-extrabold text-slate-900">{formatSats(inv.amountPaidSat ?? inv.amountSat)}</p>

      <dl className="mt-6 flex flex-col gap-3 text-sm">
        <Row k="From (payer)" v={inv.clientName} />
        <Row k="To (freelancer)" v={freelancer} />
        <Row k="For" v={inv.description} />
        <Row k="Settled" v={formatDate(inv.settledAt)} />
        <Row k="Invoice created" v={formatDate(inv.createdAt)} />
        <Row k="Memo" v={inv.memo} />
        <div className={`flex items-center justify-between gap-4 ${inv.rHashHex ? '' : 'hidden'}`}>
          <dt className="text-slate-500">Payment hash</dt>
          <dd className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-800" title={inv.rHashHex}>
              {shortHash(inv.rHashHex)}
            </span>
            <CopyButton value={inv.rHashHex} label="Copy" className="no-print btn-secondary px-2 py-1 text-xs" />
          </dd>
        </div>
      </dl>

      <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
        {inv.backend === 'wavelength' ? (
          <>
            ✓ Verified by the freelancer’s browser wallet — Wavelength reported this receive as <strong>complete</strong>.
          </>
        ) : (
          <>
            ✓ Verified by Lightning node — LND reported this invoice as <strong>SETTLED</strong>.
          </>
        )}{' '}
        The payment hash is the cryptographic fingerprint of this payment; only the payer who received the preimage could
        have completed it.
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Bitcoin {inv.backend === 'wavelength' ? 'signet' : 'regtest'} demo — no real funds.
      </p>

      <div className="no-print mt-6 flex justify-center">
        <PrintButton />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium break-words text-slate-800">{v}</dd>
    </div>
  );
}
