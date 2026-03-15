
'use client';

import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from '@/components/ui/sidebar';
import { Home, RefreshCw, User, Wallet, CircleDollarSign, History, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { usePathname } from 'next/navigation';

export function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { title: 'Home', icon: Home, url: '/' },
    { title: 'Earn OR', icon: CircleDollarSign, url: '/earning' },
    { title: 'My Wallet', icon: Wallet, url: '/wallet' },
    { title: 'Convert Coins', icon: RefreshCw, url: '/convert' },
    { title: 'Invite Friends', icon: Share2, url: '/referral' },
    { title: 'Earning History', icon: History, url: '/wallet/history' },
    { title: 'My Profile', icon: User, url: '/profile' },
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-black uppercase tracking-tighter text-xl">OR wallet</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase font-black text-[10px] tracking-widest px-4 mb-2">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-12 px-4"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="font-bold uppercase text-xs">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
