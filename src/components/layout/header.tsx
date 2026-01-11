'use client';

import { Logo } from '@/components/icons';
import { UserNav } from '@/components/layout/user-nav';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '../ui/sidebar';
import Link from 'next/link';
import { Home, RefreshCw, User as UserIcon, Wallet } from 'lucide-react';
import { useUser } from '@/firebase';

export function Header() {
  const { user } = useUser();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
       <div className='md:hidden'>
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
      <nav className="hidden w-full items-center gap-6 text-lg font-medium md:flex md:gap-5 md:text-sm lg:gap-6">
        <a
          href="#"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <Logo className="h-6 w-6" />
          <span className="font-headline text-xl">OR-wallet</span>
        </a>
      </nav>
      <div className="flex flex-1 items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {user ? <UserNav user={user} /> : null}
      </div>
    </header>
  );
}
