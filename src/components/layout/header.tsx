
'use client';

import { Logo } from '@/components/icons';
import { UserNav } from '@/components/layout/user-nav';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '../ui/sidebar';
import Link from 'next/link';
import { Home, RefreshCw, User as UserIcon, Wallet, CircleDollarSign, Gift } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

export function Header() {
  const { user } = useUser();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm relative">
       <div className="absolute left-4">
        <SidebarTrigger />
      </div>
      <Sidebar>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href="/"><Home />Home</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href="/earning"><CircleDollarSign />Earn</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href="/referral"><Gift />Refer & Earn</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href="/convert"><RefreshCw />Convert</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href="/wallet"><Wallet />Wallet</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link href="/profile"><UserIcon />Profile</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </Sidebar>
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-foreground"
      >
        <Logo className="h-6 w-6" />
        <span className="font-headline text-xl">OR-wallet</span>
      </Link>
      <div className="absolute right-4">
        {user ? <UserNav user={user} /> : null}
      </div>
    </header>
  );
}
