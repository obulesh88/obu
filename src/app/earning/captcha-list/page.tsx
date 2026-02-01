'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const REWARD_PER_CAPTCHA = 3;
const NUM_CAPTCHAS = 10;
const SUBMIT_DELAY = 15; // 15 seconds
const CAPTCHA_STORAGE_KEY = 'or_wallet_completed_captchas';
const CAPTCHA_DAY_KEY = 'or_wallet_captchas_last_day';

const ads = [
  "https://otieu.com/4/10481723",
  "https://djxh1.com/4/10481073?var={your_source_id}",
  "https://multicoloredsister.com/a7gvfy"
];

function getNextAd(userId: string): string {
    if (typeof window === 'undefined' || !userId) return ads[0].replace('{your_source_id}', 'test-user');
    let i = parseInt(localStorage.getItem("captchaAdIndex") || "0");
    const link = ads[i].replace('{your_source_id}', userId);
    localStorage.setItem("captchaAdIndex", String((i + 1) % ads.length));
    return link;
}

function generateCaptcha() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type CaptchaItem = {
  id: number;
  text: string;
};

export default function CaptchaListPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [captchas, setCaptchas] = useState<CaptchaItem[]>([]);
  const [userInputs, setUserInputs] = useState<string[]>(Array(NUM_CAPTCHAS).fill(''));
  const [submitting, setSubmitting] = useState<boolean[]>(Array(NUM_CAPTCHAS).fill(false));
  const [completed, setCompleted] = useState<boolean[]>(() => Array(NUM_CAPTCHAS).fill(false));
  const [countdown, setCountdown] = useState<number[]>(Array(NUM_CAPTCHAS).fill(0));
  const [readyToClaim, setReadyToClaim] = useState<boolean[]>(Array(NUM_CAPTCHAS).fill(false));
  const [allCaptchasCompleted, setAllCaptchasCompleted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const today = new Date().toDateString();
    const lastDay = localStorage.getItem(CAPTCHA_DAY_KEY);
    let initialCompleted = Array(NUM_CAPTCHAS).fill(false);

    if (lastDay !== today) {
      localStorage.setItem(CAPTCHA_DAY_KEY, today);
      localStorage.removeItem(CAPTCHA_STORAGE_KEY);
    } else {
      const storedCompleted = localStorage.getItem(CAPTCHA_STORAGE_KEY);
      if (storedCompleted) {
          try {
            const parsed = JSON.parse(storedCompleted);
            if(Array.isArray(parsed) && parsed.length === NUM_CAPTCHAS) {
                initialCompleted = parsed;
            }
          } catch(e) {
              console.error("Failed to parse completed captchas from storage", e);
          }
      }
    }
    setCompleted(initialCompleted);
    if(initialCompleted.every(c => c)) {
        setAllCaptchasCompleted(true);
    }

    const newCaptchas = Array.from({ length: NUM_CAPTCHAS }, (_, i) => ({
      id: i,
      text: generateCaptcha(),
    }));
    setCaptchas(newCaptchas);
  }, []);

  useEffect(() => {
    if (captchas.length > 0 && completed.every(c => c)) {
        setAllCaptchasCompleted(true);
    }
  }, [completed, captchas]);

  const refreshCaptcha = (index: number) => {
    if (submitting[index] || completed[index] || readyToClaim[index]) return;
    
    setCaptchas(prev => {
        const newCaptchas = [...prev];
        newCaptchas[index] = { ...newCaptchas[index], text: generateCaptcha() };
        return newCaptchas;
    });

    setUserInputs(prev => {
        const newUserInputs = [...prev];
        newUserInputs[index] = '';
        return newUserInputs;
    });
  };
  
  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const handleStart = (index: number) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    if (userInputs[index].toUpperCase() !== captchas[index].text) {
      toast({ variant: 'destructive', title: 'Incorrect Captcha' });
      refreshCaptcha(index);
      return;
    }

    setSubmitting(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
    setCountdown(prev => {
      const newState = [...prev];
      newState[index] = SUBMIT_DELAY;
      return newState;
    });
    
    // const adUrl = getNextAd(user.uid);
    // window.open(adUrl, '_blank');

    let currentCountdown = SUBMIT_DELAY;
    const timer = setInterval(() => {
        currentCountdown -= 1;
        setCountdown(prev => {
            const newState = [...prev];
            newState[index] = currentCountdown;
            return newState;
        });

        if (currentCountdown <= 0) {
            clearInterval(timer);
            setReadyToClaim(prev => {
                const newState = [...prev];
                newState[index] = true;
                return newState;
            });
            setSubmitting(prev => {
                const newState = [...prev];
                newState[index] = false;
                return newState;
            });
        }
    }, 1000);
  };

  const handleClaim = async (index: number) => {
      if (!user || !firestore) return;

      setSubmitting(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });

      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
            }
            const currentData = userDoc.data();
            const newOrBalance = (currentData?.wallet?.orBalance || 0) + REWARD_PER_CAPTCHA;
            transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
        });

        toast({
          title: 'Success!',
          description: `You earned ${REWARD_PER_CAPTCHA} OR coins.`,
        });

        setCompleted(prev => {
            const newState = [...prev];
            newState[index] = true;
            localStorage.setItem(CAPTCHA_STORAGE_KEY, JSON.stringify(newState));
            return newState;
        });
        setReadyToClaim(prev => {
            const newState = [...prev];
            newState[index] = false;
            return newState;
        });

      } catch (error: any) {
        // Firebase permission errors have a specific code.
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { 'wallet.orBalance': `(balance) + ${REWARD_PER_CAPTCHA}` }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: error.message || 'Could not award points.',
          });
        }
      } finally {
        setSubmitting(prev => {
            const newState = [...prev];
            newState[index] = false;
            return newState;
        });
      }
  };
  
  const getButtonContent = (index: number) => {
      if(completed[index]) return 'Completed';
      if(readyToClaim[index]) return `Claim ${REWARD_PER_CAPTCHA} OR`;
      if(submitting[index]) return `Waiting... ${countdown[index]}s`;
      return 'Submit';
  };

  const getButtonAction = (index: number) => {
      if(readyToClaim[index]) return () => handleClaim(index);
      return () => handleStart(index);
  };

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solve the Captchas</CardTitle>
          <CardDescription>Enter the characters for each captcha, click submit, wait {SUBMIT_DELAY} seconds, then claim your reward of {REWARD_PER_CAPTCHA} OR coins.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            {Array.from({ length: NUM_CAPTCHAS }).map((_, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pb-4 border-b last:border-0 last:pb-0">
                <div className="flex flex-col gap-2">
                    <Label>Captcha #{index + 1}</Label>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-12 w-full" />
                        <Button variant="ghost" size="icon" disabled>
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Your Answer</Label>
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solve the Captchas</CardTitle>
        <CardDescription>Enter the characters for each captcha, click submit, wait {SUBMIT_DELAY} seconds, then claim your reward of {REWARD_PER_CAPTCHA} OR coins.</CardDescription>
      </CardHeader>
      <CardContent>
          {allCaptchasCompleted ? (
            <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-bold">All Captchas Solved for Today!</h3>
              <p className="text-muted-foreground">Come back tomorrow for more rewards.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {captchas.map((captcha, index) => (
                <div key={captcha.id} className={cn(
                  "grid grid-cols-1 md:grid-cols-3 gap-4 items-end pb-4 border-b last:border-0 last:pb-0",
                  completed[index] && "opacity-50"
                )}>
                  <div className="flex flex-col gap-2">
                      <Label htmlFor={`captcha-display-${index}`}>Captcha #{index + 1}</Label>
                      <div id={`captcha-display-${index}`} className="flex items-center gap-2">
                          <div className="select-none rounded-md border bg-muted p-3 text-center font-mono text-xl tracking-widest flex-grow">
                          {captcha.text}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => refreshCaptcha(index)} disabled={submitting[index] || completed[index] || readyToClaim[index]}>
                              <RefreshCw className="h-5 w-5" />
                              <span className="sr-only">Refresh Captcha</span>
                          </Button>
                      </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`captcha-input-${index}`}>Your Answer</Label>
                    <Input
                      id={`captcha-input-${index}`}
                      value={userInputs[index]}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      placeholder="Enter text"
                      autoComplete="off"
                      disabled={submitting[index] || completed[index] || readyToClaim[index]}
                      className="font-mono"
                    />
                  </div>
                  <Button 
                      onClick={getButtonAction(index)}
                      disabled={submitting[index] || completed[index] || (!userInputs[index] && !readyToClaim[index])} 
                      className="w-full"
                  >
                    {getButtonContent(index)}
                  </Button>
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
