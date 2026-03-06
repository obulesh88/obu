'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, FileText, Shield, Ticket, Info, Mail, Undo2, LifeBuoy } from 'lucide-react';
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
      title: "Customer Support", 
      icon: <LifeBuoy className="h-4 w-4" />, 
      content: `OR-Wallet provides customer support to help users resolve issues related to accounts, rewards, or withdrawals. Users can contact the support team by sending an email to obuleswaror@gmail.com with a detailed explanation of the issue they are facing. Our support team aims to respond to all queries within 24 to 48 hours during business days. OR-Wallet is committed to providing timely assistance and maintaining a smooth and reliable user experience for all users of the platform.`
    },
    { 
      title: "Terms and Conditions", 
      icon: <FileText className="h-4 w-4" />, 
      content: `By accessing and using the OR-Wallet application, users agree to comply with the terms and conditions of the platform. OR-Wallet is a digital rewards platform that allows users to earn reward points by completing promotional activities such as watching advertisements, solving simple tasks, or participating in other in-app activities. These reward points can be converted into wallet balance according to the conversion rules defined within the application. Users are responsible for maintaining accurate account information and ensuring that their activities follow the platform rules. Any attempt to misuse the system, including creating multiple accounts, using automated tools, or engaging in fraudulent activities, may result in suspension or termination of the account. OR-Wallet reserves the right to modify, update, or discontinue its services or reward system at any time without prior notice. Continued use of the application indicates acceptance of these terms.`
    },
    { 
      title: "Privacy Policy", 
      icon: <Shield className="h-4 w-4" />, 
      content: `OR-Wallet respects the privacy of its users and is committed to protecting personal information. When users access or use the OR-Wallet application, we may collect certain information such as name, email address, device information, and usage data to provide and improve our services. This information is used to manage user accounts, track reward activities, process reward conversions, and handle withdrawal requests. OR-Wallet may also display advertisements from third-party ad networks which may collect anonymous data to provide relevant advertisements. We take reasonable steps to protect user information, but no internet service is completely secure. OR-Wallet does not knowingly collect personal information from children under the age of 13. By using the application, users agree to the collection and use of information according to this privacy policy. If users have any questions regarding this policy, they can contact us at obuleswaror@gmail.com.`
    },
    { 
      title: "Withdrawal Policy", 
      icon: <Ticket className="h-4 w-4" />, 
      content: `OR-Wallet allows users to request withdrawals from their wallet balance once the minimum withdrawal limit specified in the application is reached. Reward points earned from completing tasks and promotional activities can be converted into wallet balance based on the conversion rate defined in the app. Users must provide valid payment details such as UPI ID or bank account information when submitting a withdrawal request. Withdrawal requests are usually processed within 1 to 7 business days depending on verification and system processing times. OR-Wallet reserves the right to verify user accounts before approving withdrawals to prevent fraud or misuse of the platform. Withdrawal requests may be rejected if incorrect payment details are provided, suspicious activity is detected, or if the user violates the platform’s terms and conditions.`
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
