import { WalletRoot } from '@/components/wallet/WalletRoot';

export const metadata = { title: 'Browser wallet — SatoshiLink' };

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-btc-soft px-4 py-2 text-xs text-btc-dark">
        <span>
          <strong>Browser wallet mode</strong> · Wavelength (alpha) · signet test network — coins have no value
        </span>
        <span className="text-btc-dark/70">Your wallet lives in this browser only</span>
      </div>
      <WalletRoot>{children}</WalletRoot>
    </div>
  );
}
