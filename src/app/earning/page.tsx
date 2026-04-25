'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Key, Tv, Gamepad2, Users, Dices, Layers } from 'lucide-react';
import Link from 'next/link';

export default function EarningPage() {
  const earningOptions = [
    { name: 'Solve Captcha', icon: <Key className="h-8 w-8 text-primary" />, href: '/earning/captcha-list', description: 'Quick & Easy' },
    { name: 'Watch Ads', icon: <Tv className="h-8 w-8 text-blue-500" />, href: '/earning/ad-list', description: 'High Rewards' },
    { name: 'Play Games', icon: <Gamepad2 className="h-8 w-8 text-green-500" />, href: '/earning/games', description: 'Fun Tasks' },
    { name: 'Wingo', icon: <Dices className="h-8 w-8 text-orange-500" />, href: '/earning/wingo', description: 'Color Luck' },
    { name: 'K3 Lotre', icon: <Layers className="h-8 w-8 text-cyan-500" />, href: '/earning/k3', description: 'Dice Prediction' },
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
