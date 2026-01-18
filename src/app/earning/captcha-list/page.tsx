'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

const REWARD_PER_CAPTCHA = 3;
const NUM_CAPTCHAS = 10;
const SUBMIT_DELAY = 15; // 15 seconds

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
  const [completed, setCompleted] = useState<boolean[]>(Array(NUM_CAPTCHAS).fill(false));
  const [countdown, setCountdown] = useState<number[]>(Array(NUM_CAPTCHAS).fill(0));
  const [readyToClaim, setReadyToClaim] = useState<boolean[]>(Array(NUM_CAPTCHAS).fill(false));

  useEffect(() => {
    const newCaptchas = Array.from({ length: NUM_CAPTCHAS }, (_, i) => ({
      id: i,
      text: generateCaptcha(),
    }));
    setCaptchas(newCaptchas);
  }, []);

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
    
    const adUrl = 'https://multicoloredsister.com/bh3bV.0kPm3EpQv/bpmRVOJsZfDC0h2vNfz/QS2/OnTJgL2dL-TvYS3/NiDFYg5hOVDgcd';
    window.open(adUrl, '_blank');

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

      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw 'User document does not exist!';
          }
          const newOrBalance = (userDoc.data().wallet?.orBalance || 0) + REWARD_PER_CAPTCHA;
          transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
        });

        toast({
          title: 'Success!',
          description: `You earned ${REWARD_PER_CAPTCHA} OR coins.`,
        });

        setCompleted(prev => {
            const newState = [...prev];
            newState[index] = true;
            return newState;
        });
        setReadyToClaim(prev => {
            const newState = [...prev];
            newState[index] = false;
            return newState;
        });

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: 'Could not award points.',
        });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solve the Captchas</CardTitle>
        <CardDescription>Enter the characters for each captcha, click submit, wait {SUBMIT_DELAY} seconds, then claim your reward of {REWARD_PER_CAPTCHA} OR coins.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {captchas.map((captcha, index) => (
          <div key={captcha.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pb-4 border-b last:border-0 last:pb-0">
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
      </CardContent>
    </Card>
  );
}
