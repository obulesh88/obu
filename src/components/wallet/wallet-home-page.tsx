
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, History, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';


export default function WalletHomePage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const copyToClipboard = () => {
    if (!userProfile?.wallet.walletAddress) return;
    navigator.clipboard.writeText(userProfile.wallet.walletAddress);
    toast({
      title: 'Copied!',
      description: 'Wallet address copied to clipboard.',
    });
  };

  if (loading || !user) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full md:col-span-2" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">
        <span className="text-primary">OR</span>
        <span className="text-foreground">-wallet</span>
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Your INR Balance</CardTitle>
            <span className="font-semibold">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Available to withdraw</p>
            <Button variant="secondary" className="mt-4" asChild>
              <Link href="/wallet/history">
                <History className="mr-2 h-4 w-4" />
                History
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Your OR Balance</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{userProfile?.wallet?.orBalance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">OR Coins</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Your OR Wallet Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between cursor-pointer" onClick={copyToClipboard}>
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="font-mono text-lg truncate">{userProfile?.wallet?.walletAddress}</p>
                  <p className="text-xs text-muted-foreground">Share this address to receive OR coins.</p>
                </div>
              </div>
              <Copy className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Start Earning</CardTitle>
            <CardDescription>
              Begin your journey to earn OR coins by completing simple activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/earning">
                Start Earning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
