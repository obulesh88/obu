
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, FileText, Shield, Ticket, Info, Undo2, LifeBuoy, Edit2, Check, RefreshCw, LogOut, Fingerprint } from 'lucide-react';
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
import { updateProfile, signOut } from 'firebase/auth';
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
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      
      updateDoc(userDocRef, updateData)
        .then(() => {
          toast({
            title: 'Profile Updated',
            description: 'Your display name has been changed successfully.',
          });
          setIsEditingName(false);
        })
        .catch(async (error: any) => {
          if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'update',
              requestResourceData: updateData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          }
        })
        .finally(() => setIsSavingName(false));
    } catch (error: any) {
      setIsSavingName(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update auth profile.',
      });
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: 'Logged out', description: 'See you again soon!' });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out.' });
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
      content: `OR wallet is a professional digital rewards and micro-tasking platform. We connect users with advertisers and market researchers, providing a platform where users can earn micro-incentives (OR coins) by completing verified digital tasks such as captcha solving and content engagement.`
    },
    { 
      title: "Customer Support", 
      icon: <LifeBuoy className="h-4 w-4" />, 
      content: `OR wallet provides customer support at obuleswaror@gmail.com. We aim to respond to all queries within 24 to 48 hours.`
    },
    { 
      title: "Terms and Conditions", 
      icon: <FileText className="h-4 w-4" />, 
      content: `By accessing OR wallet, users agree to follow platform rules. Points can be converted to balance according to conversion rules. Misuse may result in account termination.`
    },
    { 
      title: "Privacy Policy", 
      icon: <Shield className="h-4 w-4" />, 
      content: `We collect name, email, and device info to manage rewards and payouts. We take reasonable steps to protect your data.`
    },
    { 
      title: "Withdrawal Policy", 
      icon: <Ticket className="h-4 w-4" />, 
      content: `Withdrawals are processed after reaching minimum limits. Users must provide valid UPI or Bank details. Requests take 1-7 business days.`
    },
    { 
      title: "Refund & Cancellation Policy", 
      icon: <Undo2 className="h-4 w-4" />, 
      content: `No deposits are accepted. Once processed, transactions are final.`
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
              <div className="flex items-center gap-1.5 text-primary">
                <Fingerprint className="h-3 w-3" />
                <p className="text-[10px] font-black tracking-widest uppercase">{userProfile.memberId}</p>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{userProfile.email}</p>
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
                <Label htmlFor="memberId" className="text-[10px] font-bold uppercase text-primary">Unique Member ID</Label>
                <Input id="memberId" value={userProfile.memberId} readOnly className="h-11 font-black bg-muted text-primary" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="accountType" className="text-[10px] font-bold uppercase">Account Type</Label>
                <Input id="accountType" value="Verified Earner" readOnly className="h-11 font-bold bg-muted" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email ?? ''} readOnly className="h-11 font-bold bg-muted" />
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

      <div className="pt-4">
        <Button 
          variant="destructive" 
          className="w-full h-12 font-black uppercase flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Log Out Account
        </Button>
      </div>
    </div>
  );
}
