import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import Wallet from '@/components/wallet/wallet';

export default function WalletPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Wallet />
      </main>
      <BottomNav />
    </div>
  );
}
