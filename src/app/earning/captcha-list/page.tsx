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
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';

const REWARD_PER_CAPTCHA = 3;
const NUM_CAPTCHAS = 10;
const SUBMIT_DELAY = 15; // 15 seconds wait
const CAPTCHA_STORAGE_KEY = 'or_wallet_completed_captchas';
const CAPTCHA_DAY_KEY = 'or_wallet_captchas_last_day';

const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA";

function generateCaptcha() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type CaptchaItem = {
  id: number;
  text: string;
};

async function callGetAd(userId: string) {
  try {
    const response = await fetch(
      "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ad",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ userId })
      }
    );

    const data = await response.json();
    if (data.success) {
      return data.adUrl;
    }
    return null;
  } catch (err) {
    console.error("Error calling ad function:", err);
    return null;
  }
}

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

  const handleStart = async (index: number) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    if (userInputs[index].toUpperCase() !== captchas[index].text) {
      toast({ variant: 'destructive', title: 'Incorrect Captcha' });
      refreshCaptcha(index);
      return;
    }

    const division = index < 3 ? 'A' : index < 6 ? 'B' : 'C';

    // For Division A, trigger ad tracking
    if (division === 'A') {
      const adWindow = window.open('about:blank', '_blank');
      const adUrl = await callGetAd(user.uid);
      if (adUrl && adWindow) {
        adWindow.location.href = adUrl;
      } else if (adWindow) {
        adWindow.close();
      }
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

  const handleClaim = (index: number) => {
      if (!user || !firestore) return;

      setSubmitting(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });

      const userDocRef = doc(firestore, 'users', user.uid);
      const updateData = {
          'wallet.orBalance': increment(REWARD_PER_CAPTCHA),
          'captcha.verifiedAt': serverTimestamp(),
          'captcha.claimed': true,
          'captcha.reward_comm': REWARD_PER_CAPTCHA,
          'updatedAt': serverTimestamp()
      };

      updateDoc(userDocRef, updateData)
        .catch(async (error: any) => {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
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
    setSubmitting(prev => {
        const newState = [...prev];
        newState[index] = false;
        return newState;
    });
  };
  
  const getButtonContent = (index: number) => {
      if(completed[index]) return 'Completed';
      if(readyToClaim[index]) return `Claim ${REWARD_PER_CAPTCHA} OR`;
      if(submitting[index]) return `Waiting... ${countdown[index]}s`;
      return 'Submit';
  };

  const renderCaptchaItem = (index: number) => (
    <div key={captchas[index]?.id || index} className={cn(
      "grid grid-cols-1 md:grid-cols-3 gap-4 items-end pb-4 border-b last:border-0 last:pb-0",
      completed[index] && "opacity-50"
    )}>
      <div className="flex flex-col gap-2">
          <Label htmlFor={`captcha-display-${index}`}>Captcha #{index + 1}</Label>
          <div id={`captcha-display-${index}`} className="flex items-center gap-2">
              <div className="select-none rounded-md border bg-muted p-3 text-center font-mono text-xl tracking-widest flex-grow">
              {captchas[index]?.text || '......'}
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
          onClick={readyToClaim[index] ? () => handleClaim(index) : () => handleStart(index)}
          disabled={submitting[index] || completed[index] || (!userInputs[index] && !readyToClaim[index])} 
          className="w-full"
      >
        {getButtonContent(index)}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Solve the Captchas</CardTitle>
          <CardDescription>Enter the characters for each captcha, click submit, and wait {SUBMIT_DELAY} seconds to claim your reward.</CardDescription>
        </CardHeader>
        <CardContent>
            {!isClient ? (
              <div className="space-y-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : allCaptchasCompleted ? (
              <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h3 className="text-xl font-bold">All Captchas Solved for Today!</h3>
                <p className="text-muted-foreground">Come back tomorrow for more rewards.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {/* Division A */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-primary">Division A</h3>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-6">
                    {[0, 1, 2].map(index => renderCaptchaItem(index))}
                  </div>
                </div>

                {/* Division B */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-primary">Division B</h3>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-6">
                    {[3, 4, 5].map(index => renderCaptchaItem(index))}
                  </div>
                </div>

                {/* Division C */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-primary">Division C</h3>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-6">
                    {[6, 7, 8, 9].map(index => renderCaptchaItem(index))}
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
