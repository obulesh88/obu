
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, History, Link as LinkIcon, ArrowRight, Wallet, RefreshCw, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { Separator } from '../ui/separator';


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
        <div className="grid gap-6">
            <div className="flex items-center justify-between py-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between py-2">
        <SidebarTrigger className="h-10 w-10 hover:bg-muted" />
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-headline text-lg font-black uppercase tracking-tighter">OR wallet</span>
        </div>
        <Link href="/profile">
           <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-black">
                {userProfile?.profile?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
        </Link>
      </div>

      <Card className="bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none">
          <Wallet className="h-64 w-64" />
        </div>
        <CardContent className="p-8 space-y-4">
           <div>
             <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Total INR Balance</p>
             <h2 className="text-5xl font-black tracking-tighter">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</h2>
           </div>
           <div className="flex items-center gap-4">
              <Button variant="secondary" className="flex-1 font-black uppercase text-xs h-11" asChild>
                <Link href="/wallet">
                  <Landmark className="mr-2 h-4 w-4" /> Withdraw
                </Link>
              </Button>
              <Button variant="outline" className="flex-1 font-black uppercase text-xs h-11 bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                <Link href="/convert">
                  <RefreshCw className="mr-2 h-4 w-4" /> Convert
                </Link>
              </Button>
           </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2">
        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">OR Coins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{userProfile?.wallet?.orBalance?.toLocaleString() || '0'}</div>
            <p className="text-[10px] font-bold uppercase mt-1 opacity-50">Available to convert</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm" asChild>
          <Link href="/wallet/history" className="cursor-pointer hover:bg-muted/5 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black">History</div>
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase mt-1 opacity-50">View all records</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <Card className="border-primary/10 bg-card/50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wallet Address</p>
              <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-6 w-6">
                  <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="font-mono text-xs font-bold break-all bg-muted/50 p-3 rounded-lg border">{userProfile?.wallet?.walletAddress}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground shrink-0">Main Tasks</h3>
          <Separator className="flex-1 opacity-20" />
        </div>
        
        <div className="grid gap-4">
          <Button asChild size="lg" className="h-16 rounded-2xl shadow-lg font-black uppercase text-lg group">
            <Link href="/earning">
              Start Earning Zone <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
