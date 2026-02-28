'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The login page is now a simple redirect to home since authentication
 * has been removed from the application flow.
 */
export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Redirecting...</h1>
        <p className="text-muted-foreground">Taking you to the dashboard.</p>
      </div>
    </div>
  );
}
