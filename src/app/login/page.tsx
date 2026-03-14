'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Welcome back!', description: 'Redirecting to your wallet...' });
      } else {
        // Validation for phone number
        if (phoneNumber.length < 10) {
          throw new Error('Please enter a valid mobile number.');
        }

        // Store phone number in localStorage for the useUser hook to pick up during profile init
        localStorage.setItem('pending_phone_number', phoneNumber);
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        toast({ title: 'Account created!', description: 'Welcome to OR wallet.' });
      }
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message || 'Check your credentials and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <Logo className="h-12 w-12" />
        <h1 className="text-3xl font-black uppercase tracking-tighter">OR wallet</h1>
      </div>

      <Card className="w-full max-w-sm border-primary/10">
        <CardHeader>
          <CardTitle className="uppercase font-black">{isLogin ? 'Login' : 'Create Account'}</CardTitle>
          <CardDescription className="text-xs font-bold uppercase">
            {isLogin ? 'Access your digital rewards' : 'Start earning OR coins today'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Full Name</Label>
                  <Input 
                    required 
                    placeholder="John Doe" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Mobile Number</Label>
                  <Input 
                    required 
                    type="tel"
                    placeholder="91XXXXXXXX" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Email Address</Label>
              <Input 
                type="email" 
                required 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Password</Label>
              <Input 
                type="password" 
                required 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full h-12 font-black uppercase" disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLogin ? 'Sign In' : 'Join Now'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-[10px] uppercase font-bold"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
