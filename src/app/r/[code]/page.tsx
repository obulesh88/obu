
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Referral Entry point.
 * Captures the referral code from the URL and stores it for the sign-up process.
 */
export default function ReferralRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code as string;

  useEffect(() => {
    if (code) {
      localStorage.setItem('or_wallet_referral_code', code.toUpperCase());
    }
    // Redirect to login/signup page
    router.replace('/login');
  }, [code, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <Skeleton className="h-12 w-48" />
      <p className="text-sm text-muted-foreground font-bold uppercase animate-pulse">
        Processing Invitation...
      </p>
    </div>
  );
}
