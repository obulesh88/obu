'use client';

import { Logo } from '@/components/icons';
import { UserNav } from '@/components/layout/user-nav';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const { toast } = useToast();

  const handleWithdraw = () => {
    toast({
      title: 'Withdrawal Processing',
      description: `Your withdrawal of $${user.balance.toFixed(2)} has been initiated.`,
    });
  };
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <nav className="flex w-full items-center gap-6 text-lg font-medium md:gap-5 md:text-sm lg:gap-6">
        <a
          href="#"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <Logo className="h-6 w-6" />
          <span className="font-headline text-xl">EarnEasy</span>
        </a>
      </nav>
      <div className="flex flex-1 items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-xs text-muted-foreground">Your Balance</p>
                <p className="font-semibold text-lg">${user.balance.toFixed(2)}</p>
            </div>
            <Button
                onClick={handleWithdraw}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
              Withdraw
            </Button>
        </div>
        <UserNav user={user} />
      </div>
    </header>
  );
}
