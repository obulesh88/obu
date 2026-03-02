'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, FileText, Shield, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ProfilePage() {
  const { user, userProfile, loading } = useUser();
  const { setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if(!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <div>Please log in to view your profile.</div>;
  }

  const policies = [
    { 
      title: "Terms and Conditions", 
      icon: <FileText className="h-4 w-4" />, 
      content: `Welcome to OR Wallet (“we,” “our,” or “us”). By accessing or using the OR Wallet website and services (the “Service”), you agree to these Terms and Conditions, including our privacy, rewards, and withdrawal policies.

1. Eligibility: You must be at least 13 years old to use OR Wallet. If you are under 18, you must use the website with permission from a parent or legal guardian.

2. User Accounts: You are responsible for maintaining account confidentiality and all activity under your account.

3. Rewards: Rewards have no cash value until withdrawn. Fraud, VPN, bots, scripts, automation, or multiple accounts are prohibited.

4. Limitation of Liability: OR Wallet is not liable for loss of earnings, loss of data, or service interruptions.`
    },
    { 
      title: "Privacy Policy", 
      icon: <Shield className="h-4 w-4" />, 
      content: `We respect your privacy and collect limited information to operate OR Wallet.

Information We Collect: Name/username, Email address, Device/browser data, IP address, and transaction records.

How We Use Information: To provide and operate the website, track rewards, and prevent fraud and abuse.

Data Security: We use reasonable security measures to protect user information. We do not sell personal data.`
    },
    { 
      title: "Withdrawal Policy", 
      icon: <Ticket className="h-4 w-4" />, 
      content: `Users may withdraw earnings once minimum withdrawal limits (₹1.00) are reached.

Conditions:
- Identity verification may be required.
- Incorrect payment details are user responsibility.
- Fraud checks may delay or cancel withdrawals.
- Processing time depends on payment providers.
- OR Wallet may refuse payouts for policy violations.`
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback>{userProfile.profile?.displayName?.charAt(0) || userProfile.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <h2 className="text-2xl font-bold">{userProfile.profile?.displayName}</h2>
            <p className="text-muted-foreground">{userProfile.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={userProfile.profile?.displayName ?? ''} readOnly />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email ?? ''} readOnly />
            </div>
            <div className="space-y-2">
                <Label htmlFor="wallet-addr">Wallet Address</Label>
                <Input id="wallet-addr" value={userProfile.wallet.walletAddress} readOnly className="font-mono text-xs" />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal & Policies</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {policies.map((policy) => (
            <Dialog key={policy.title}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-3">
                  {policy.icon}
                  {policy.title}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{policy.title}</DialogTitle>
                  <DialogDescription>Review our official {policy.title.toLowerCase()}.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {policy.content}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={() => setTheme('light')} className="flex-1">
            <Sun className="mr-2 h-4 w-4" /> Light
          </Button>
          <Button variant="outline" onClick={() => setTheme('dark')} className="flex-1">
            <Moon className="mr-2 h-4 w-4" /> Dark
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}