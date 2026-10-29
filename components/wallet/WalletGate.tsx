'use client';

import { useWallet, useWalletCreate, useWalletUnlock } from '@lightninglabs/wavelength-react';
import type { WavelengthError } from '@lightninglabs/wavelength-web';
import { useState } from 'react';
import { Notice } from './WalletApp';

/** Renders the right screen for each wallet phase; children only render once the wallet is ready. */
export function WalletGate({ children }: { children: React.ReactNode }) {
  const { phase, error, start } = useWallet();
  const [mnemonic, setMnemonic] = useState<string[] | null>(null);

  // Show the recovery phrase until the user confirms, even though the wallet is already ready.
  if (mnemonic) return <BackupPhrase words={mnemonic} onDone={() => setMnemonic(null)} />;

  switch (phase) {
    case 'loading':
    case 'runtimeReady':
    case 'starting':
      return <Spinner text="Starting your browser wallet…" hint="The first visit downloads the wallet engine (~20 MB). Later visits load from cache." />;
    case 'syncing':
    case 'restoring':
      return <Spinner text="Syncing your wallet with the signet network…" />;
    case 'needsWallet':
      return <CreateWallet onCreated={setMnemonic} />;
    case 'locked':
      return <UnlockWallet />;
    case 'ready':
      return <>{children}</>;
    case 'error': {
      const code = (error as WavelengthError | null)?.code;
      return (
        <Notice title={code === 'wallet_locked' ? 'Wallet already open in another tab' : 'The browser wallet stopped'}>
          {code === 'wallet_locked'
            ? 'Only one tab can run the wallet at a time. Close the other SatoshiLink wallet tab, then try again.'
            : (error?.message ?? 'Unknown error.')}
          <div className="mt-4">
            <button className="btn-primary" onClick={() => start().catch(() => undefined)}>
              Try again
            </button>
          </div>
        </Notice>
      );
    }
    default:
      return (
        <Notice title="Wallet stopped">
          <button className="btn-primary mt-2" onClick={() => start().catch(() => undefined)}>
            Start wallet
          </button>
        </Notice>
      );
  }
}

function Spinner({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-btc-soft border-t-btc" />
      <p className="font-medium text-slate-800">{text}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function CreateWallet({ onCreated }: { onCreated: (words: string[]) => void }) {
  const { create, createPending, createError } = useWalletCreate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('Passwords don’t match.');
    setErr('');
    try {
      const res = await create({ password: pw });
      onCreated(res.mnemonic);
    } catch {
      // shown via createError
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto flex max-w-md flex-col gap-4 p-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Create your browser wallet</h2>
        <p className="mt-1 text-sm text-slate-600">
          A self-custodial Lightning wallet that lives in this browser — no node needed. Runs on <strong>signet</strong>{' '}
          (Bitcoin’s public test network, coins have no value).
        </p>
      </div>
      <input className="input" type="password" placeholder="Wallet password (min 8 characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      <input className="input" type="password" placeholder="Repeat password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
      {(err || createError) && <p className="text-sm text-red-600">{err || createError?.message}</p>}
      <button className="btn-primary" disabled={createPending}>
        {createPending ? 'Creating wallet…' : 'Create wallet'}
      </button>
      <p className="text-xs text-slate-400">The password encrypts the wallet on this device. It is never sent anywhere.</p>
    </form>
  );
}

function BackupPhrase({ words, onDone }: { words: string[]; onDone: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="card mx-auto flex max-w-lg flex-col gap-4 p-8">
      <h2 className="text-lg font-bold text-slate-900">Write down your recovery phrase</h2>
      <p className="text-sm text-slate-600">
        These {words.length} words are the only way to recover this wallet if the browser data is cleared. This is shown
        once.
      </p>
      <ol className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm sm:grid-cols-3">
        {words.map((w, i) => (
          <li key={i}>
            <span className="text-slate-400">{i + 1}.</span> {w}
          </li>
        ))}
      </ol>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I’ve written it down somewhere safe
      </label>
      <button className="btn-primary" disabled={!ok} onClick={onDone}>
        Continue to wallet
      </button>
    </div>
  );
}

function UnlockWallet() {
  const { unlock, unlockPending, unlockError } = useWalletUnlock();
  const [pw, setPw] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        unlock({ password: pw }).catch(() => undefined);
      }}
      className="card mx-auto flex max-w-md flex-col gap-4 p-8"
    >
      <h2 className="text-lg font-bold text-slate-900">Unlock your browser wallet</h2>
      <input className="input" type="password" placeholder="Wallet password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus />
      {unlockError && <p className="text-sm text-red-600">Couldn’t unlock — check the password.</p>}
      <button className="btn-primary" disabled={unlockPending || !pw}>
        {unlockPending ? 'Unlocking…' : 'Unlock'}
      </button>
    </form>
  );
}
