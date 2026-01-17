'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

const REWARD_PER_CAPTCHA = 3;
const NUM_CAPTCHAS = 10;
const TOTAL_REWARD = REWARD_PER_CAPTCHA * NUM_CAPTCHAS;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    refreshAllCaptchas();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);


  const refreshAllCaptchas = () => {
    const newCaptchas = Array.from({ length: NUM_CAPTCHAS }, (_, i) => ({
      id: i,
      text: generateCaptcha(),
    }));
    setCaptchas(newCaptchas);
    setUserInputs(Array(NUM_CAPTCHAS).fill(''));
  };
  
  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to earn rewards.',
      });
      return;
    }

    for (let i = 0; i < NUM_CAPTCHAS; i++) {
      if (userInputs[i].toUpperCase() !== captchas[i].text) {
        toast({
          variant: 'destructive',
          title: 'Incorrect Captcha',
          description: `Captcha #${i + 1} is incorrect. Please try again.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    setCountdown(15);
    
    const adUrl = 'https://multicoloredsister.com/bh3bV.0kPm3EpQv/bpmRVOJsZfDC0h2vNfz/QS2/OnTJgL2dL-TvYS3/NiDFYg5hOVDgcd';
    window.open(adUrl, '_blank');

    const script = document.createElement('script');
    script.src = adUrl;
    script.async = true;
    document.body.appendChild(script);

    setTimeout(async () => {
      try {
        if (!firestore || !user) throw new Error("Firebase not initialized");
        const userDocRef = doc(firestore, 'users', user.uid);
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw 'User document does not exist!';
          }

          const currentData = userDoc.data();
          const newOrBalance = (currentData.wallet?.orBalance || 0) + TOTAL_REWARD;

          transaction.update(userDocRef, {
            'wallet.orBalance': newOrBalance,
          });
        });

        toast({
          title: 'Success!',
          description: `You have earned ${TOTAL_REWARD} OR coins.`,
        });
        refreshAllCaptchas();
      } catch (error: any) {
        console.error('Failed to award points: ', error);
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: 'Could not award points. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    }, 15000);
  };

  const allFieldsFilled = userInputs.every(input => input.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Solve the Captchas</CardTitle>
                <CardDescription>Enter the characters for each captcha to earn {TOTAL_REWARD} OR coins.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={refreshAllCaptchas} disabled={isSubmitting}>
              <RefreshCw className="h-5 w-5" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {captchas.map((captcha, index) => (
          <div key={captcha.id} className="grid grid-cols-[1fr_2fr] items-center gap-4">
            <div className="select-none rounded-md border bg-muted p-3 text-center font-mono text-xl tracking-widest">
              {captcha.text}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`captcha-input-${index}`}>Captcha #{index + 1}</Label>
              <Input
                id={`captcha-input-${index}`}
                value={userInputs[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="Your answer"
                autoComplete="off"
                disabled={isSubmitting}
                className="font-mono"
              />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || !allFieldsFilled} className="w-full">
          {isSubmitting
            ? `Please wait ${countdown}s`
            : `Submit & Earn ${TOTAL_REWARD} OR`}
        </Button>
      </CardFooter>
    </Card>
  );
}
