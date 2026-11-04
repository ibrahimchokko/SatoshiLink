'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatSats, shortHash } from '@/lib/format';
import type { Withdrawal } from '@/lib/types';

const BOLT11_MULTIPLIER: Record<string, number> = { '': 1, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12 };

/** Sats encoded in a BOLT11 invoice's prefix (e.g. lnbcrt12340n1… → 1,234), or undefined if it has no amount. */
function bolt11Sats(invoice: string): number | undefined {
  const hrp = invoice.slice(0, invoice.lastIndexOf('1')); // bech32: the last "1" separates prefix from data
  const m = /^ln(?:bcrt|bc|tbs|tb|sb)(\d+)([munp]?)$/.exec(hrp);
  return m ? Math.round(Number(m[1]) * BOLT11_MULTIPLIER[m[2]] * 1e8) : undefined;
}

function detect(raw: string) {
  const v = raw.trim().replace(/^(lightning|bitcoin):/i, '').split('?')[0];
  if (!v) return { kind: null };
  if (/^ln/i.test(v)) return { kind: 'lightning' as const, value: v, invoiceSats: bolt11Sats(v.toLowerCase()) };
  return { kind: 'onchain' as const, value: v };
}

/** "Withdraw" card on the wallet page: sends sats from the LND node to an external Lightning wallet or Bitcoin address. */
export function WithdrawForm() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [amountSat, setAmountSat] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const d = detect(destination);
  const needsAmount = d.kind === 'onchain' || (d.kind === 'lightning' && !d.invoiceSats);
  const sats = d.kind === 'lightning' && d.invoiceSats ? d.invoiceSats : Number(amountSat) || 0;

  function edit(set: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      set(e.target.value);
      setConfirming(false);
      setError('');
    };
  }

  function review(e: React.FormEvent) {
    e.preventDefault();
    setSuccess('');
    if (!d.kind) return setError('Paste a Lightning invoice or a Bitcoin address.');
    if (needsAmount && !/^\d+$/.test(amountSat.trim())) return setError('Enter the amount in whole sats.');
    setConfirming(true);
  }

  async function send() {
    setSending(true);
    setError('');
    const started = performance.now();
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, amountSat: needsAmount ? amountSat : undefined }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? 'Something went wrong.');
      const w = data.withdrawal as Withdrawal;
      const secs = ((performance.now() - started) / 1000).toFixed(1);
      setSuccess(
        w.method === 'lightning'
          ? `Sent ✓ ${formatSats(w.amountSat)} arrived in ${secs} s (fee ${formatSats(w.feeSat ?? 0)}).`
          : `Broadcast ✓ ${formatSats(w.amountSat)} is on its way. It lands after the next block — in Polar, click “Mine” (or turn on auto-mining) to confirm it.`,
      );
      setDestination('');
      setAmountSat('');
      router.refresh();
    } catch {
      setError('Could not reach the app server. Is `npm run dev` running?');
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <form onSubmit={review} noValidate className="card flex flex-col gap-3 p-5">
      <div>
        <h2 className="font-semibold text-slate-900">Withdraw</h2>
        <p className="text-xs text-slate-500">Send sats from your node to any other wallet.</p>
      </div>
      <textarea
        className="input min-h-20 font-mono text-xs break-all"
        placeholder="Lightning invoice (lnbcrt…) or Bitcoin address (bcrt1…)"
        value={destination}
        onChange={edit(setDestination)}
        spellCheck={false}
      />
      {d.kind === 'lightning' && (
        <p className="text-xs text-slate-600">
          ⚡ Lightning invoice{d.invoiceSats ? ` for ${formatSats(d.invoiceSats)}` : ' with no amount'} · arrives in seconds
        </p>
      )}
      {d.kind === 'onchain' && <p className="text-xs text-slate-600">⛓ Bitcoin address · arrives after 1 block confirmation, network fee added</p>}
      {needsAmount && (
        <input className="input" inputMode="numeric" placeholder="Amount in sats" value={amountSat} onChange={edit(setAmountSat)} />
      )}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}

      {confirming && d.kind ? (
        <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            Send <strong>{formatSats(sats)}</strong> {d.kind === 'lightning' ? 'over Lightning' : 'on-chain'} to{' '}
            <span className="font-mono text-xs">{shortHash(d.value, 10)}</span>? This can’t be undone.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={send} disabled={sending}>
              {sending ? 'Sending…' : 'Confirm & send'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} disabled={sending}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-primary">Review withdrawal</button>
      )}

      <p className="text-xs text-slate-400">
        Bank account (fiat) cash-out isn’t available: it needs a licensed exchange partner and real bitcoin, so it can’t run on a test
        network.
      </p>
    </form>
  );
}
