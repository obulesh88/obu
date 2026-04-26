
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet, Landmark, PlusCircle } from 'lucide-react';
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
  const { user, userProfile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="grid gap-6">
            <div className="flex items-center justify-between py-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
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
        <Link href="/profile" className="flex items-center gap-3">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase text-primary tracking-tighter">{userProfile?.memberId}</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Member ID</p>
           </div>
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
        <CardContent className="p-8 space-y-6">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Available Balance</p>
               <h2 className="text-5xl font-black tracking-tighter">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</h2>
             </div>
             <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/20 flex flex-col items-end">
                <span className="text-[10px] font-black tracking-widest uppercase opacity-70">ID</span>
                <span className="text-xs font-black tracking-tight">{userProfile?.memberId}</span>
             </div>
           </div>
           <div className="flex items-center gap-3">
              <Button variant="secondary" className="flex-1 font-black uppercase text-xs h-11" asChild>
                <Link href="/wallet?tab=withdraw">
                  <Landmark className="mr-2 h-4 w-4" /> Withdraw
                </Link>
              </Button>
              <Button variant="outline" className="flex-1 font-black uppercase text-xs h-11 bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link href="/wallet?tab=deposit">
                  <PlusCircle className="mr-2 h-4 w-4" /> Deposit
                </Link>
              </Button>
           </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden" asChild>
          <Link href="/wallet/history" className="cursor-pointer hover:bg-muted/5 transition-colors p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activity Log</p>
              <p className="text-xl font-black">History Center</p>
            </div>
            <ArrowRight className="h-6 w-6 text-primary" />
          </Link>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground shrink-0">Earning Zone</h3>
          <Separator className="flex-1 opacity-20" />
        </div>
        
        <div className="grid gap-4">
          <Button asChild size="lg" className="h-16 rounded-2xl shadow-lg font-black uppercase text-lg group">
            <Link href="/earning">
              Start Tasks <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
