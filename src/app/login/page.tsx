
'use client';

import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { doc, setDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const SignUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  referredBy: z.string().optional(),
});
type SignUpSchemaType = z.infer<typeof SignUpSchema>;

const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type SignInSchemaType = z.infer<typeof SignInSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading } = useUser();

  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    setValue: setSignUpValue,
    formState: { errors: errorsSignUp, isSubmitting: isSubmittingSignUp },
  } = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      referredBy: referralCodeFromUrl || '',
    },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (referralCodeFromUrl) {
      setSignUpValue('referredBy', referralCodeFromUrl.toUpperCase());
    }
  }, [referralCodeFromUrl, setSignUpValue]);

  const {
    register: registerSignIn,
    handleSubmit: handleSubmitSignIn,
    formState: { errors: errorsSignIn, isSubmitting: isSubmittingSignIn },
  } = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
  });

  const generateReferralCode = (name: string) => {
    const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${base}${random}`.toUpperCase();
  };

  const onSignUp: SubmitHandler<SignUpSchemaType> = async (data) => {
    if (!auth || !firestore) return;
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, { displayName: data.name });

      const myReferralCode = generateReferralCode(data.name);
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      
      const referralCodeUsed = data.referredBy?.trim().toUpperCase() || null;
      let referrerUid = "";

      // 2. Try to find referrer UID if a code was used (Non-blocking check)
      if (referralCodeUsed) {
        try {
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where('referral.referralCode', '==', referralCodeUsed));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            referrerUid = querySnapshot.docs[0].id;
          }
        } catch (queryError) {
          // If query fails (e.g. missing index), we still allow signup to proceed
          console.warn("Referral verification query failed, proceeding without attribution:", queryError);
        }
      }

      // 3. Create User Profile
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
            referredBy: referralCodeUsed,
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

      // Create the document. Use .catch() for security rules errors.
      setDoc(userDocRef, newProfile)
          .catch(async (error: any) => {
              if (error.code === 'permission-denied') {
                  const permissionError = new FirestorePermissionError({
                      path: userDocRef.path,
                      operation: 'create',
                      requestResourceData: newProfile,
                  } satisfies SecurityRuleContext);
                  errorEmitter.emit('permission-error', permissionError);
              }
          });

      // 4. Create Referral Log if valid referrer found
      if (referralCodeUsed && referrerUid) {
        try {
          const referralsRef = collection(firestore, 'referrals');
          const referralData = {
            referralId: `ref_${Date.now()}`,
            referrerUid: referrerUid,
            referredUid: userCredential.user.uid,
            referralCode: referralCodeUsed,
            referralDate: serverTimestamp(),
            claimed: false
          };
          addDoc(referralsRef, referralData).catch(() => {});
        } catch (refLogErr) {
          console.warn("Could not log referral event:", refLogErr);
        }
      }

      toast({
        title: 'Sign Up Successful',
        description: `Welcome! Your unique referral code is ${myReferralCode}.`,
      });
      
      setTimeout(() => router.push('/'), 500);
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
                <div className="space-y-2">
                  <Label htmlFor="signup-referral">Referral Code (Optional)</Label>
                  <Input 
                    id="signup-referral" 
                    placeholder="Enter referral code" 
                    {...registerSignUp('referredBy')}
                    className="uppercase font-mono"
                  />
                  {referralCodeFromUrl && !errorsSignUp.referredBy && (
                    <p className="text-xs text-primary font-medium">Auto-filled from link.</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmittingSignUp}>
                    {isSubmittingSignUp ? 'Creating Account...' : 'Sign-Up'}
                </Button>
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
