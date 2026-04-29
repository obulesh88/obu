'use client';

import { useState, useEffect } from 'react';
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
import { RefreshCw, FileText, UserPlus } from 'lucide-react';
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
  const [referralCode, setReferralCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Pre-fill referral code from localStorage if coming from a referral link
  useEffect(() => {
    const storedCode = localStorage.getItem('or_wallet_referral_code');
    if (storedCode && !isLogin) {
      setReferralCode(storedCode.toUpperCase());
    }
  }, [isLogin]);

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

        // Store registration metadata in localStorage for the initialization hook
        localStorage.setItem('pending_phone_number', phoneNumber);
        if (referralCode.trim()) {
          localStorage.setItem('or_wallet_referral_code', referralCode.trim().toUpperCase());
        }
        
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
    3. Rewards: Digital rewards are incentives earned by completing tasks and engaging with content.
    4. Prohibited Conduct: Any attempt to manipulate tasks, use bots, or create multiple accounts will result in immediate termination.
    5. Withdrawals: Payouts are processed to verified UPI or Bank accounts. Processing takes 1-7 business days. Minimum withdrawal is ₹100.
    6. Privacy: We value your data. Your information is used solely for task verification and payout processing.
    7. Termination: We reserve the right to suspend accounts that violate our security protocols.
  `;

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto max-h-full">
      <div className="flex flex-col items-center gap-2">
        <Logo className="h-12 w-12 text-primary" />
        <h1 className="text-3xl font-black uppercase tracking-tighter">OR wallet</h1>
      </div>

      <Card className="w-full max-w-sm border-primary/10">
        <CardHeader>
          <CardTitle className="uppercase font-black text-xl">{isLogin ? 'Login' : 'Create Account'}</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            {isLogin ? 'Access your digital rewards' : 'Start earning rewards today'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-wider">Full Name</Label>
                  <Input 
                    required 
                    placeholder="John Doe" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-wider">Mobile Number</Label>
                  <Input 
                    required 
                    type="tel"
                    placeholder="91XXXXXXXX" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-primary">Referral Code (Optional)</Label>
                  <div className="relative">
                    <Input 
                      placeholder="ENTER CODE" 
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="h-11 font-mono tracking-widest uppercase pl-10"
                    />
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider">Email Address</Label>
              <Input 
                type="email" 
                required 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-wider">Password</Label>
              <Input 
                type="password" 
                required 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            {!isLogin && (
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={termsAccepted} 
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-1"
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
              className="w-full h-12 font-black uppercase text-lg shadow-xl active:scale-95 transition-all" 
              disabled={isLoading || (!isLogin && !termsAccepted)}
            >
              {isLoading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isLogin ? 'Sign In' : 'Join Now'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-[10px] uppercase font-bold tracking-widest hover:bg-primary/5"
              onClick={() => {
                setIsLogin(!isLogin);
                setTermsAccepted(false);
              }}
            >
              {isLogin ? "New user? Create Account" : "Back to Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
