import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SatoshiLink — Get paid in Bitcoin in seconds',
  description: 'Lightning invoices for freelancers. Create, share, get paid — verified by your own Lightning node.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="no-print border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-btc text-white">⚡</span>
              SatoshiLink
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:gap-3">
              <Link href="/dashboard" className="rounded-lg px-2 py-1.5 hover:bg-slate-100">
                Dashboard
              </Link>
              {/* Plain <a>: the wallet needs a full page load to get its cross-origin isolation headers. */}
              <a href="/wallet" className="rounded-lg px-2 py-1.5 hover:bg-slate-100">
                Wallet
              </a>
              <Link href="/how-it-works" className="hidden rounded-lg px-2 py-1.5 hover:bg-slate-100 sm:inline">
                How it works
              </Link>
              <Link href="/new" className="btn-primary px-3 py-1.5">
                New invoice
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
        <footer className="no-print border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          SatoshiLink · Hackathon demo on Bitcoin <strong>regtest</strong> (LND) and <strong>signet</strong> (browser wallet) — no
          real money is used.
        </footer>
      </body>
    </html>
  );
}
