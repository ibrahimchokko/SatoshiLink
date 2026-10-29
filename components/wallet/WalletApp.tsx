'use client';

import { WavelengthProvider } from '@lightninglabs/wavelength-react';
import {
  createWebWalletEngine,
  defaultConfig,
  RUNTIME_MANIFEST_VERSION,
  type WalletEngine,
} from '@lightninglabs/wavelength-web';
import { WalletGate } from './WalletGate';

// One engine per page load: the daemon's browser storage is exclusive to one runtime per origin.
let engine: WalletEngine | null = null;
function getEngine() {
  // Must be absolute: the SDK resolves asset names with new URL(name, base), which rejects a path-only base.
  const base = `${window.location.origin}/wavewalletdk/${RUNTIME_MANIFEST_VERSION}/`;
  engine ??= createWebWalletEngine({
    runtimeBaseUrl: base,
    workerURL: `${base}wavewalletdk-worker.js`,
    config: defaultConfig('signet'),
    autoStart: true,
  });
  return engine;
}

/** Client-only (loaded with ssr:false). Boots the in-browser Wavelength wallet on signet. */
export default function WalletApp({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
    return (
      <Notice title="Browser wallet can’t start on this page">
        This page isn’t cross-origin isolated, which the wallet needs. Open it directly (type{' '}
        <code className="font-mono">/wallet</code> in the address bar) or reload the page.
        <div className="mt-4">
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </Notice>
    );
  }

  return (
    <WavelengthProvider engine={getEngine()}>
      <WalletGate>{children}</WalletGate>
    </WavelengthProvider>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </div>
  );
}
