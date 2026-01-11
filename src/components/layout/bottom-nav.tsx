'use client';

import { Home, RefreshCw, Wallet, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function BottomNav() {
  const navItems = [
    { href: '/', icon: <Home />, label: 'Home' },
    { href: '/convert', icon: <RefreshCw />, label: 'Convert' },
    { href: '/wallet', icon: <Wallet />, label: 'Wallet' },
    { href: '/profile', icon: <User />, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className="flex h-full flex-col items-center justify-center gap-1 rounded-none text-muted-foreground"
            asChild
          >
            <Link href={item.href}>
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
