'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    // Firebase removed
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Button onClick={handleGoogleSignIn}>Sign in with Google</Button>
    </div>
  );
}
