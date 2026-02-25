'use client';

import { Home, RefreshCw, Wallet, User, CircleDollarSign, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLayout } from '@/context/layout-context';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { isBottomNavVisible } = useLayout();
  const pathname = usePathname();

  if (!isBottomNavVisible) {
    return null;
  }

  const navItems = [
    { href: '/', icon: <Home className="h-5 w-5" />, label: 'Home' },
    { href: '/earning', icon: <CircleDollarSign className="h-5 w-5" />, label: 'Earn' },
    { href: '/referral', icon: <Gift className="h-5 w-5" />, label: 'Refer' },
    { href: '/wallet', icon: <Wallet className="h-5 w-5" />, label: 'Wallet' },
    { href: '/profile', icon: <User className="h-5 w-5" />, label: 'Profile' },
  ];

  return (
    <div className="z-50 w-full border-t bg-background shrink-0">
      <div className="grid h-16 grid-cols-5 items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.label}
              variant="ghost"
              className={cn(
                "flex h-full flex-col items-center justify-center gap-1 rounded-none border-t-2 border-transparent transition-all",
                isActive ? "text-primary border-t-primary bg-primary/5" : "text-muted-foreground"
              )}
              asChild
            >
              <Link href={item.href}>
                {item.icon}
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
