import { WalletInvoiceView } from '@/components/wallet/WalletInvoiceView';

export default async function WalletInvoicePage({ params }: PageProps<'/wallet/invoice/[id]'>) {
  const { id } = await params;
  return <WalletInvoiceView id={id} />;
}
