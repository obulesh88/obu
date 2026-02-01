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
import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useUser } from '@/hooks/use-user';
import { doc, setDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp } from 'firebase/app';

const SignUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type SignUpSchemaType = z.infer<typeof SignUpSchema>;

const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type SignInSchemaType = z.infer<typeof SignInSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);


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

  const onSignUp: SubmitHandler<SignUpSchemaType> = async (data) => {
    if (!auth) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, { displayName: data.name });

      // Create user profile in Firestore
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      
      const newProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
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
          captcha: {
            captcha_required: false,
            captcha_verified: false,
            captcha_verified_at: null,
          },
          playGames: {
            is_active: false,
            min_required_seconds: 300,
            play_start: null,
            total_play_seconds: 0,
          },
          rewards: {
            claimed: null,
            reward_coins: 0,
          },
          watchAds: {
            ad_completed_at: null,
            ad_provider: 'Monetag',
            ad_required: false,
            ad_start: null,
            ad_verified: false,
          },
          status: {
            status: 'Active',
          },
      };

      await setDoc(userDocRef, newProfile);

      toast({
        title: 'Sign Up Successful',
        description: "You're now logged in.",
      });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'An unexpected error occurred.',
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
        console.error(error);
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
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" {...registerSignUp('password')} />
                  {errorsSignUp.password && <p className="text-destructive text-xs">{errorsSignUp.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmittingSignUp}>
                    {isSubmittingSignUp ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
