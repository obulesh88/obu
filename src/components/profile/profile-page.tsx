'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, FileText, Shield, Ticket, Info, Undo2, LifeBuoy, Edit2, Check, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useFirestore } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function ProfilePage() {
  const { user, userProfile, loading } = useUser();
  const { setTheme } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if(!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (userProfile?.profile?.displayName) {
      setNewName(userProfile.profile.displayName);
    }
  }, [userProfile]);

  const handleUpdateName = async () => {
    if (!auth?.currentUser || !firestore || !newName.trim()) return;

    setIsSavingName(true);
    const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
    const updateData = {
      'profile.displayName': newName.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { displayName: newName.trim() });

      // 2. Update Firestore Document
      await updateDoc(userDocRef, updateData);

      toast({
        title: 'Profile Updated',
        description: 'Your display name has been changed successfully.',
      });
      setIsEditingName(false);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update name. Please try again.',
        });
      }
    } finally {
      setIsSavingName(false);
    }
  };

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
      content: `OR wallet is a professional digital rewards and micro-tasking platform. We connect users with advertisers and market researchers, providing a platform where users can earn micro-incentives (OR coins) by completing verified digital tasks such as captcha solving and content engagement.

Our mission is to democratize digital earning opportunities while maintaining the highest standards of transparency and user data protection. We are a registered business entity committed to building a trusted ecosystem for earners in India.`
    },
    { 
      title: "Customer Support", 
      icon: <LifeBuoy className="h-4 w-4" />, 
      content: `OR wallet provides customer support to help users resolve issues related to accounts, rewards, or withdrawals. Users can contact the support team by sending an email to obuleswaror@gmail.com with a detailed explanation of the issue they are facing. Our support team aims to respond to all queries within 24 to 48 hours during business days. OR wallet is committed to providing timely assistance and maintaining a smooth and reliable user experience for all users of the platform.`
    },
    { 
      title: "Terms and Conditions", 
      icon: <FileText className="h-4 w-4" />, 
      content: `By accessing and using the OR wallet application, users agree to comply with the terms and conditions of the platform. OR wallet is a digital rewards platform that allows users to earn reward points by completing promotional activities such as watching advertisements, solving simple tasks, or participating in other in-app activities. These reward points can be converted into wallet balance according to the conversion rules defined within the application. Users are responsible for maintaining accurate account information and ensuring that their activities follow the platform rules. Any attempt to misuse the system, including creating multiple accounts, using automated tools, or engaging in fraudulent activities, may result in suspension or termination of the account. OR wallet reserves the right to modify, update, or discontinue its services or reward system at any time without prior notice. Continued use of the application indicates acceptance of these terms.`
    },
    { 
      title: "Privacy Policy", 
      icon: <Shield className="h-4 w-4" />, 
      content: `OR wallet respects the privacy of its users and is committed to protecting personal information. When users access or use the OR wallet application, we may collect certain information such as name, email address, device information, and usage data to provide and improve our services. This information is used to manage user accounts, track reward activities, process reward conversions, and handle withdrawal requests. OR wallet may also display advertisements from third-party ad networks which may collect anonymous data to provide relevant advertisements. We take reasonable steps to protect user information, but no internet service is completely secure. OR wallet does not knowingly collect personal information from children under the age of 13. By using the application, users agree to the collection and use of information according to this privacy policy. If users have any questions regarding this policy, they can contact us at obuleswaror@gmail.com.`
    },
    { 
      title: "Withdrawal Policy", 
      icon: <Ticket className="h-4 w-4" />, 
      content: `OR wallet allows users to request withdrawals from their wallet balance once the minimum withdrawal limit specified in the application is reached. Reward points earned from completing tasks and promotional activities can be converted into wallet balance based on the conversion rate defined in the app. Users must provide valid payment details such as UPI ID or bank account information when submitting a withdrawal request. Withdrawal requests are usually processed within 1 to 7 business days depending on verification and system processing times. OR wallet reserves the right to verify user accounts before approving withdrawals to prevent fraud or misuse of the platform. Withdrawal requests may be rejected if incorrect payment details are provided, suspicious activity is detected, or if the user violates the platform’s terms and conditions.`
    },
    { 
      title: "Refund & Cancellation Policy", 
      icon: <Undo2 className="h-4 w-4" />, 
      content: `OR wallet is an earning platform; we do not accept payments or deposits from users.

1. No Deposits: As a zero-deposit platform, there are no refunds for user payments.
2. Reward Adjustments: If a task is found to be completed incorrectly or through automated means, we reserve the right to cancel the associated OR coins.
3. Withdrawal Cancellation: Users may request to cancel a 'Pending' withdrawal through our contact email before it has been processed. Once 'Completed', transactions are final and non-refundable.`
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <Card className="border-primary/10 bg-primary/5">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">
                {userProfile.profile?.displayName?.charAt(0) || userProfile.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <h2 className="text-2xl font-black uppercase tracking-tight">{userProfile.profile?.displayName}</h2>
              <p className="text-xs font-bold text-muted-foreground uppercase">{userProfile.email}</p>
            </div>
          </div>
          <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                <Edit2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-black uppercase">Edit Name</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase">Update your identity in the app.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newName" className="text-[10px] font-bold uppercase">Full Name</Label>
                  <Input 
                    id="newName" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    placeholder="Enter your name"
                    className="h-12 font-bold"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full h-12 font-black uppercase" onClick={handleUpdateName} disabled={isSavingName || !newName.trim()}>
                  {isSavingName ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="accountType" className="text-[10px] font-bold uppercase">Account Type</Label>
                <Input id="accountType" value="Verified Earner" readOnly className="h-11 font-bold bg-muted" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email ?? ''} readOnly className="h-11 font-bold bg-muted" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="wallet-addr" className="text-[10px] font-bold uppercase">Internal Wallet ID</Label>
                <Input id="wallet-addr" value={userProfile.wallet.walletAddress} readOnly className="font-mono text-[10px] bg-muted h-11" />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase">Legal & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {policies.map((policy) => (
            <Dialog key={policy.title}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-3 h-12 font-bold uppercase text-[10px]">
                  {policy.icon}
                  {policy.title}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-black uppercase">{policy.title}</DialogTitle>
                  <DialogDescription className="text-xs font-bold uppercase">Review our professional {policy.title.toLowerCase()}.</DialogDescription>
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
          <CardTitle className="text-sm font-black uppercase">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={() => setTheme('light')} className="flex-1 h-12 font-black uppercase text-[10px]">
            <Sun className="mr-2 h-4 w-4" /> Light
          </Button>
          <Button variant="outline" onClick={() => setTheme('dark')} className="flex-1 h-12 font-black uppercase text-[10px]">
            <Moon className="mr-2 h-4 w-4" /> Dark
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
