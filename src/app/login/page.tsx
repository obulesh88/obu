'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useEffect, Suspense, useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useUser } from '@/hooks/use-user';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ShieldCheck, Scale } from 'lucide-react';

const SignUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type SignUpSchemaType = z.infer<typeof SignUpSchema>;

const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type SignInSchemaType = z.infer<typeof SignInSchema>;

function PolicyLink({ title, icon: Icon, content }: { title: string, icon: any, content: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-[10px] text-muted-foreground hover:text-primary underline underline-offset-2 flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {title}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="text-sm space-y-4 text-muted-foreground leading-relaxed">
            {content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function LoginContent() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading } = useUser();

  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: errorsSignUp, isSubmitting: isSubmittingSignUp },
  } = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
  });

  const {
    register: registerSignIn,
    handleSubmit: handleSubmitSignIn,
    formState: { errors: errorsSignIn, isSubmitting: isSubmittingSignIn },
  } = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
  });

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const generateReferralCode = (name: string) => {
    const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${base}${random}`.toUpperCase();
  };

  const onSignUp: SubmitHandler<SignUpSchemaType> = async (data) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, { displayName: data.name });

      const myReferralCode = generateReferralCode(data.name);
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      
      const newProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          phoneNumber: data.phoneNumber,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          profile: {
              displayName: data.name,
              Uid: userCredential.user.uid,
          },
          wallet: {
              orBalance: 0,
              inrBalance: 0,
              walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          },
          referral: {
            referralCode: myReferralCode,
            referredBy: null,
            referralCount: 0,
            totalReferralEarnings: 0,
          },
          captcha: {
            is_active: false,
            verifiedAt: null,
            claimed: false,
            reward_comm: 0,
          },
          playGames: {
            is_active: false,
            min_required_seconds: 300,
            play_start: null,
            total_play_seconds: 0,
            verifiedAt: null,
            claimed: false,
            reward_comm: 0,
            game_id: null,
          },
          watchAds: {
            ad_provider: 'Monetag',
            ad_start: null,
            verifiedAt: null,
            ad_completed: false,
            reward_comm: 0,
          },
          status: {
            status: 'Active',
          },
      };

      await setDoc(userDocRef, newProfile);

      toast({
        title: 'Sign Up Successful',
        description: `Welcome! Your unique referral code is ${myReferralCode}.`,
      });
      
      router.push('/referral/entry');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'An unexpected error occurred during registration.',
      });
    }
  };

  const onSignIn: SubmitHandler<SignInSchemaType> = async (data) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: 'Sign In Successful',
        description: "Welcome back!",
      });
      router.push('/');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: error.message || 'Invalid credentials',
        });
    }
  };

  if (loading || user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">
            <span className="text-primary">OR</span>
            <span className="text-foreground">-wallet</span>
        </CardTitle>
          <CardDescription>Sign in or create an account to start earning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSubmitSignIn(onSignIn)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" {...registerSignIn('email')} />
                  {errorsSignIn.email && <p className="text-destructive text-xs">{errorsSignIn.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" {...registerSignIn('password')} />
                  {errorsSignIn.password && <p className="text-destructive text-xs">{errorsSignIn.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmittingSignIn}>
                    {isSubmittingSignIn ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSubmitSignUp(onSignUp)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input id="signup-name" {...registerSignUp('name')} />
                  {errorsSignUp.name && <p className="text-destructive text-xs">{errorsSignUp.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" {...registerSignUp('email')} />
                  {errorsSignUp.email && <p className="text-destructive text-xs">{errorsSignUp.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input id="signup-phone" type="tel" {...registerSignUp('phoneNumber')} />
                  {errorsSignUp.phoneNumber && <p className="text-destructive text-xs">{errorsSignUp.phoneNumber.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" {...registerSignUp('password')} />
                  {errorsSignUp.password && <p className="text-destructive text-xs">{errorsSignUp.password.message}</p>}
                </div>
                <div className="pt-2">
                   <Button type="submit" className="w-full" disabled={isSubmittingSignUp}>
                      {isSubmittingSignUp ? 'Creating Account...' : 'Sign-Up'}
                  </Button>
                </div>
                
                {/* Policies Section */}
                <div className="pt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t">
                  <PolicyLink 
                    title="Terms & Conditions" 
                    icon={FileText} 
                    content={
                      <>
                        <p><strong>1. Acceptance of Terms:</strong> By creating an account on OR-wallet, you agree to abide by all rules and regulations set forth in this document.</p>
                        <p><strong>2. User Conduct:</strong> Users must not engage in fraudulent activities, including but not limited to using multiple accounts, automated bots, or manipulated referral links.</p>
                        <p><strong>3. Service Modification:</strong> We reserve the right to modify rewards, conversion rates, and features at any time without prior notice.</p>
                        <p><strong>4. Account Termination:</strong> Violation of any policy may result in immediate account suspension and forfeiture of all earned coins.</p>
                      </>
                    }
                  />
                  <PolicyLink 
                    title="Withdrawal Policy" 
                    icon={ShieldCheck} 
                    content={
                      <>
                        <p><strong>1. Conversion Rate:</strong> OR coins are converted at a rate of 1,000 OR = ₹1.00 INR.</p>
                        <p><strong>2. Limits:</strong> Minimum withdrawal is ₹1.00 and Maximum per transaction is ₹10.00.</p>
                        <p><strong>3. Verification:</strong> All withdrawals are subject to review. Fraudulent earnings will be denied.</p>
                        <p><strong>4. Bank Details:</strong> Users must provide accurate bank details. OR-wallet is not responsible for transfers to incorrect accounts provided by the user.</p>
                      </>
                    }
                  />
                  <PolicyLink 
                    title="Referral Policy" 
                    icon={Scale} 
                    content={
                      <>
                        <p><strong>1. Rewards:</strong> Earn 3,000 OR for every successful referral. New users get 1,000 OR joining bonus.</p>
                        <p><strong>2. Verification:</strong> Referrals must be verified through the app's verification system before rewards can be claimed.</p>
                        <p><strong>3. Self-Referral:</strong> Creating multiple accounts to refer yourself is strictly prohibited and will lead to a permanent ban.</p>
                        <p><strong>4. Fair Play:</strong> We use AI and manual review to ensure all referrals are genuine and from different devices/IPs.</p>
                      </>
                    }
                  />
                </div>
                <p className="text-[10px] text-center text-muted-foreground">
                  By signing up, you agree to our Terms and Policies.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
