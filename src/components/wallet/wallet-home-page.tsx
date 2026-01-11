'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, Copy, History, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { useUser } from '@/firebase';


export default function WalletHomePage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();

  const copyToClipboard = () => {
    if (!userProfile?.wallet.walletAddress) return;
    navigator.clipboard.writeText(userProfile.wallet.walletAddress);
    toast({
      title: 'Copied!',
      description: 'Wallet address copied to clipboard.',
    });
  };

  if (loading) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full md:col-span-2" />
             <Skeleton className="h-48 w-full md:col-span-2" />
        </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Your INR Balance</CardTitle>
          <span className="font-semibold">₹</span>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">Available to withdraw</p>
          <Button variant="secondary" className="mt-4">
            <History className="mr-2 h-4 w-4" />
            History
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Avatar className="h-10 w-10">
                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="font-mono text-lg truncate">{userProfile?.wallet?.walletAddress}</p>
                <p className="text-xs text-muted-foreground">Share this address to receive OR coins.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={copyToClipboard} disabled={!userProfile?.wallet?.walletAddress}>
              <Copy className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            <span>Start Earning</span>
          </CardTitle>
          <CardDescription>
            Complete tasks to earn OR coins. Our AI will help you find tasks that match your skills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/tasks" passHref>
            <Button className="w-full">
              <span>View Tasks</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
