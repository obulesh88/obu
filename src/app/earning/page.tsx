'use client';

import { Card } from '@/components/ui/card';
import { Tv, Gamepad2, Users, Dices, Layers, Sword, Bomb } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EarningPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const earningOptions = [
    { name: 'Watch Ads', icon: <Tv className="h-8 w-8 text-blue-500" />, href: '/earning/ad-list', description: 'High Rewards' },
    { name: 'Play Games', icon: <Gamepad2 className="h-8 w-8 text-green-500" />, href: '/earning/games', description: 'Fun Tasks' },
    { name: 'Mines', icon: <Bomb className="h-8 w-8 text-yellow-500" />, href: '/earning/mines', description: 'Hidden Gems' },
    { name: 'Wingo', icon: <Dices className="h-8 w-8 text-orange-500" />, href: '/earning/wingo', description: 'Color Luck' },
    { name: 'K3 Lotre', icon: <Layers className="h-8 w-8 text-cyan-500" />, href: '/earning/k3', description: 'Dice Prediction' },
    { name: 'Dragon vs Tiger', icon: <Sword className="h-8 w-8 text-rose-500" />, href: '/earning/dragon-tiger', description: 'Legendary Battle' },
    { name: 'Refer & Earn', icon: <Users className="h-8 w-8 text-purple-500" />, href: '/referral', description: 'Invite Friends' },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">Earning Zone</h1>
        <p className="text-sm text-muted-foreground">Pick a task and start accumulating rewards.</p>
      </div>
      
      <div className="grid gap-4 grid-cols-2">
        {earningOptions.map((option) => (
          <Card key={option.name} className="flex flex-col overflow-hidden border-primary/10 transition-all hover:border-primary/40 active:scale-95">
            <Link href={option.href} className="flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="rounded-2xl bg-muted p-4 mb-4">
                {option.icon}
              </div>
              <p className="font-bold text-sm uppercase tracking-tight">{option.name}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{option.description}</p>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
