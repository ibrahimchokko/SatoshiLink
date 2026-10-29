'use client';

import dynamic from 'next/dynamic';

// The wallet runs WebAssembly + a Web Worker in the browser, so it must never render on the server.
const WalletApp = dynamic(() => import('./WalletApp'), {
  ssr: false,
  loading: () => (
    <div className="card mx-auto max-w-md p-10 text-center text-sm text-slate-500">Loading browser wallet…</div>
  ),
});

export function WalletRoot({ children }: { children: React.ReactNode }) {
  return <WalletApp>{children}</WalletApp>;
}
