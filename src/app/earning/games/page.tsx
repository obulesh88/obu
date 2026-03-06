'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GamesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/earning');
  }, [router]);

  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-muted-foreground">This feature is no longer available. Redirecting...</p>
    </div>
  );
}
