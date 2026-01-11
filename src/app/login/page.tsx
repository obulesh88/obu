'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);


  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: errorsSignUp },
  } = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
  });

  const {
    register: registerSignIn,
    handleSubmit: handleSubmitSignIn,
    formState: { errors: errorsSignIn },
  } = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
  });

  const handleUserCreation = async (user: any, displayName?: string | null) => {
    if (!user) return;
    const userRef = doc(firestore, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      profile: {
        displayName: displayName || user.displayName,
        photoURL: user.photoURL,
      },
      wallet: {
        orBalance: 0,
        inrBalance: 0,
        walletAddress: `0x${user.uid.substring(0,10)}...${user.uid.slice(-4)}`,
      },
      createdAt: serverTimestamp(),
    }, { merge: true });
    router.push('/');
  };

  const onSignUp: SubmitHandler<SignUpSchemaType> = async (data) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await handleUserCreation(result.user, data.name);
    } catch (error: any) {
      console.error("Sign up failed: ", error);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message,
      });
    }
  };

  const onSignIn: SubmitHandler<SignInSchemaType> = async (data) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      router.push('/');
    } catch (error: any) {
      console.error("Sign in failed: ", error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message,
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
                <Button type="submit" className="w-full">Sign In</Button>
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
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
