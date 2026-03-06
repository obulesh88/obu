'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, FileText, Shield, Ticket, Info, Mail, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
      title: "About Us", 
      icon: <Info className="h-4 w-4" />, 
      content: `OR Wallet is a professional digital rewards and micro-tasking platform. We connect users with advertisers and market researchers, providing a platform where users can earn micro-incentives (OR coins) by completing verified digital tasks such as captcha solving and content engagement.

Our mission is to democratize digital earning opportunities while maintaining the highest standards of transparency and user data protection. We are a registered business entity committed to building a trusted ecosystem for earners in India.`
    },
    { 
      title: "Contact Us", 
      icon: <Mail className="h-4 w-4" />, 
      content: `If you have questions about your account, rewards, or our services, please contact our support team.

Business Email: obuleswaror@gmail.com
Support Hours: Monday - Friday, 10:00 AM to 6:00 PM IST
Estimated Response Time: 24-48 business hours.

For legal inquiries or business partnerships, please use the email address provided above.`
    },
    { 
      title: "Terms and Conditions", 
      icon: <FileText className="h-4 w-4" />, 
      content: `By using the OR Wallet platform, you agree to comply with the following terms:

1. User Eligibility: Users must be at least 18 years of age or have legal guardian consent.
2. Acceptable Use: You agree not to use VPNs, bots, scripts, or multiple accounts to manipulate earning activities.
3. Digital Rewards: OR coins are internal platform credits that represent potential eligibility for payouts and carry no independent cash value.
4. Account Security: You are responsible for maintaining the security of your guest session and account data.
5. Termination: We reserve the right to suspend accounts found engaging in fraudulent activities without prior notice.`
    },
    { 
      title: "Privacy Policy", 
      icon: <Shield className="h-4 w-4" />, 
      content: `OR Wallet respects your privacy. We collect minimal data necessary to provide our services:

1. Data Collection: We collect guest IDs, email addresses (for payout delivery), and basic device information to prevent fraud.
2. Data Usage: Your data is used exclusively for account management, reward tracking, and processing payouts.
3. Third Parties: We do not sell your personal data. We may share anonymized data with advertising partners for task verification.
4. Security: We implement standard security protocols to protect our database and your payout information.`
    },
    { 
      title: "Withdrawal Policy", 
      icon: <Ticket className="h-4 w-4" />, 
      content: `Withdrawals are subject to verification to maintain platform integrity.

1. Minimum Limit: The minimum withdrawal threshold is ₹1.00.
2. Maximum Limit: For security and manual verification purposes, the maximum single withdrawal is ₹10.00.
3. Verification: All payout requests are manually audited. Verification typically takes 1-3 business days.
4. Payout Methods: We currently support UPI, Bank Transfer, and Digital Gift Cards.
5. Compliance: Any account found violating terms of service will have their pending withdrawals cancelled.`
    },
    { 
      title: "Refund & Cancellation Policy", 
      icon: <Undo2 className="h-4 w-4" />, 
      content: `OR Wallet is an earning platform; we do not accept payments or deposits from users.

1. No Deposits: As a zero-deposit platform, there are no refunds for user payments.
2. Reward Adjustments: If a task is found to be completed incorrectly or through automated means, we reserve the right to cancel the associated OR coins.
3. Withdrawal Cancellation: Users may request to cancel a 'Pending' withdrawal through our contact email before it has been processed. Once 'Completed', transactions are final and non-refundable.`
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
                <Label htmlFor="displayName">Account Type</Label>
                <Input id="displayName" value="Verified Earner" readOnly />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email ?? ''} readOnly />
            </div>
            <div className="space-y-2">
                <Label htmlFor="wallet-addr">Internal Wallet ID</Label>
                <Input id="wallet-addr" value={userProfile.wallet.walletAddress} readOnly className="font-mono text-xs" />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal & Compliance</CardTitle>
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
                  <DialogDescription>Review our professional {policy.title.toLowerCase()}.</DialogDescription>
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
