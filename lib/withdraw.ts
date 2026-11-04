import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  decodePayReq,
  friendlyLndError,
  getTransactions,
  LndError,
  sendCoins,
  sendPayment,
  type LndPaymentFailure,
} from './lnd';
import { createWithdrawal, listWithdrawals, updateWithdrawal } from './store';
import type { Withdrawal } from './types';
import { MAX_SATS, type WithdrawInput } from './validation';

/** Lightning withdrawals give up after this long (and LND guarantees nothing was sent). */
export const PAY_TIMEOUT_SEC = 60;

/** An error whose message is safe and friendly enough to show in the UI. */
export class WithdrawError extends Error {}

const PAYMENT_FAILURES: Partial<Record<LndPaymentFailure, string>> = {
  FAILURE_REASON_TIMEOUT: `The payment timed out after ${PAY_TIMEOUT_SEC} seconds. Nothing left your wallet — try again.`,
  FAILURE_REASON_NO_ROUTE:
    'No route to that wallet. Your node needs a channel path to it — in Polar, check the receiving node is running and connected by a channel.',
  FAILURE_REASON_INSUFFICIENT_BALANCE: 'Not enough Lightning balance for that amount (plus routing fees).',
  FAILURE_REASON_INCORRECT_PAYMENT_DETAILS: 'The receiving wallet rejected the payment (unknown invoice or wrong amount).',
};

// Raw LND error text → plain English. Anything unmatched gets a generic message; details stay in server logs.
const LND_ERRORS: [RegExp, string][] = [
  [/not valid for this network|not for current active network/i, 'That’s for a different Bitcoin network. This demo runs on regtest — use a bcrt1… address or an lnbcrt… invoice.'],
  [/unknown format|checksum|invalid (address|character|bech32)|failed converting|decod/i, 'That doesn’t look like a valid Lightning invoice or Bitcoin address.'],
  [/insufficient funds/i, 'Not enough confirmed on-chain balance for that amount plus the network fee. Coins from a recent transaction can’t be spent until a block confirms them — mine one in Polar.'],
  [/dust/i, 'That amount is too small to send on-chain (the minimum is about 546 sats).'],
  [/already paid|already succeeded/i, 'That invoice has already been paid.'],
  [/self-payments/i, 'That invoice was made by your own node — use one from the wallet you want to withdraw to.'],
  [/expired/i, 'That invoice has expired — ask for a new one.'],
];

function toWithdrawError(e: unknown): WithdrawError {
  const raw = (e as Error).message ?? String(e);
  console.error('[lnd] withdrawal failed:', raw);
  if (e instanceof LndError && e.kind === 'lnd') {
    const hit = LND_ERRORS.find(([re]) => re.test(raw));
    return new WithdrawError(hit?.[1] ?? 'The Lightning node rejected the withdrawal. Check the server logs for details.');
  }
  return new WithdrawError(friendlyLndError(e).message);
}

export async function withdraw(input: WithdrawInput): Promise<Withdrawal> {
  const dest = input.destination;
  // BOLT11 is case-insensitive (QR codes use upper case); on-chain addresses are passed through as-is.
  return /^ln/i.test(dest) ? withdrawLightning(dest.toLowerCase(), input.amountSat) : withdrawOnchain(dest, input.amountSat);
}

async function withdrawLightning(payReq: string, amountSat?: number): Promise<Withdrawal> {
  const req = await decodePayReq(payReq).catch((e) => {
    throw toWithdrawError(e);
  });

  const invoiceSat = Number(req.num_satoshis ?? 0);
  const sats = invoiceSat || amountSat;
  if (!sats) throw new WithdrawError('This invoice has no amount — enter how many sats to send.');
  if (sats > MAX_SATS) throw new WithdrawError(`Amount can’t be more than ${MAX_SATS.toLocaleString('en-US')} sats`);
  if (req.timestamp && (Number(req.timestamp) + Number(req.expiry ?? 3600)) * 1000 < Date.now())
    throw new WithdrawError('That invoice has expired — ask for a new one.');

  const payment = await sendPayment(payReq, {
    amtSat: invoiceSat ? undefined : sats,
    feeLimitSat: Math.max(10, Math.ceil(sats * 0.01)),
    timeoutSec: PAY_TIMEOUT_SEC,
  }).catch((e) => {
    // If our HTTP call times out, the payment may still complete — don't tell the user it failed.
    if (e instanceof LndError && /ETIMEDOUT/.test(e.message))
      throw new WithdrawError('The payment is still in progress. Check your balance in a minute before trying again.');
    throw toWithdrawError(e);
  });

  if (payment.status === 'IN_FLIGHT')
    throw new WithdrawError('The payment is still in progress. Check your balance in a minute before trying again.');
  if (payment.status !== 'SUCCEEDED') {
    console.error('[lnd] payment failed:', payment.failure_reason);
    throw new WithdrawError(
      PAYMENT_FAILURES[payment.failure_reason ?? 'FAILURE_REASON_ERROR'] ?? 'The payment failed. Nothing left your wallet — try again.',
    );
  }

  const now = new Date().toISOString();
  return createWithdrawal({
    id: randomUUID().replace(/-/g, '').slice(0, 10),
    method: 'lightning',
    destination: payReq,
    amountSat: sats,
    feeSat: Number(payment.fee_sat ?? 0),
    status: 'complete',
    reference: payment.payment_hash,
    memo: req.description || undefined,
    createdAt: now,
    completedAt: now,
  });
}

async function withdrawOnchain(addr: string, amountSat?: number): Promise<Withdrawal> {
  if (!amountSat) throw new WithdrawError('Enter how many sats to send to this address.');
  const { txid } = await sendCoins(addr, amountSat, 'SatoshiLink withdrawal').catch((e) => {
    throw toWithdrawError(e);
  });
  return createWithdrawal({
    id: randomUUID().replace(/-/g, '').slice(0, 10),
    method: 'onchain',
    destination: addr,
    amountSat,
    status: 'pending',
    reference: txid,
    createdAt: new Date().toISOString(),
  });
}

/** All withdrawals, with unconfirmed on-chain ones re-checked against the node (fee + confirmations). */
export async function listWithdrawalsLive(): Promise<Withdrawal[]> {
  const all = await listWithdrawals();
  if (!all.some((w) => w.status === 'pending')) return all;
  try {
    const { transactions = [] } = await getTransactions();
    const byHash = new Map(transactions.map((t) => [t.tx_hash, t]));
    return await Promise.all(
      all.map(async (w) => {
        const tx = w.status === 'pending' ? byHash.get(w.reference) : undefined;
        if (!tx) return w;
        const feeSat = Number(tx.total_fees ?? 0);
        const confirmed = (tx.num_confirmations ?? 0) > 0;
        if (!confirmed && w.feeSat === feeSat) return w;
        const patch: Partial<Withdrawal> = confirmed ? { feeSat, status: 'complete', completedAt: new Date().toISOString() } : { feeSat };
        return (await updateWithdrawal(w.id, patch)) ?? w;
      }),
    );
  } catch (e) {
    console.error('[lnd] gettransactions failed:', (e as Error).message);
    return all;
  }
}
