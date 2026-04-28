
'use client';

import WalletPageContent from '@/components/wallet/wallet-page-content';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    }>
      <WalletPageContent />
    </Suspense>
  );
}
