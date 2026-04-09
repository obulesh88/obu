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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';
import { RefreshCw, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    if (!isLogin && !termsAccepted) {
      toast({
        variant: 'destructive',
        title: 'Terms not accepted',
        description: 'You must agree to the Terms and Conditions to create an account.',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Welcome back!', description: 'Redirecting to your wallet...' });
      } else {
        if (phoneNumber.length < 10) {
          throw new Error('Please enter a valid mobile number.');
        }
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

  const termsContent = `
    1. Acceptance of Terms: By creating an account on OR wallet, you agree to abide by these terms.
    2. Eligibility: You must provide accurate information, including a valid email and mobile number.
    3. Rewards: OR coins are micro-incentives earned by completing tasks. 1000 OR = ₹1.
    4. Prohibited Conduct: Any attempt to manipulate tasks, use bots, or create multiple accounts will result in immediate termination.
    5. Withdrawals: Payouts are processed to verified UPI or Bank accounts. Processing takes 1-7 business days.
    6. Privacy: We value your data. Your information is used solely for task verification and payout processing.
    7. Termination: We reserve the right to suspend accounts that violate our security protocols.
  `;

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

            {!isLogin && (
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted} 
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-[10px] font-bold uppercase leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I agree to the
                  </label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-[10px] font-black text-primary uppercase underline text-left">
                        Terms and Conditions
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-black uppercase flex items-center gap-2">
                          <FileText className="h-5 w-5" /> Terms and Conditions
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase">
                          Please review our platform rules.
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                        <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {termsContent}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              className="w-full h-12 font-black uppercase" 
              disabled={isLoading || (!isLogin && !termsAccepted)}
            >
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLogin ? 'Sign In' : 'Join Now'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-[10px] uppercase font-bold"
              onClick={() => {
                setIsLogin(!isLogin);
                setTermsAccepted(false);
              }}
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
