
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReferralPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
