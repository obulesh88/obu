
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

const REWARD_AMOUNT = 3;
const SUBMIT_DELAY = 15; // 15 seconds

function generateCaptcha() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function CaptchaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open) {
      setCaptchaText(generateCaptcha());
      setUserInput('');
      setIsSubmitting(false);
      setCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const refreshCaptcha = () => {
    setCaptchaText(generateCaptcha());
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

    if (userInput.toUpperCase() !== captchaText) {
      toast({
        variant: 'destructive',
        title: 'Incorrect Captcha',
        description: 'Please try again.',
      });
      refreshCaptcha();
      setUserInput('');
      return;
    }
    
    setIsSubmitting(true);
    setCountdown(SUBMIT_DELAY);
    
    const adUrl = 'https://multicoloredsister.com/bh3bV.0kPm3EpQv/bpmRVOJsZfDC0h2vNfz/QS2/OnTJgL2dL-TvYS3/NiDFYg5hOVDgcd';
    window.open(adUrl, '_blank');

    // Add the script before processing the reward
    const script = document.createElement('script');
    const lastScript = document.scripts[document.scripts.length - 1];
    script.src = '//multicoloredsister.com/bh3bV.0kPm3EpQv/bpmRVOJsZfDC0h2vNfz/QS2/OnTJgL2dL-TvYS3/NiDFYg5hOVDgcd';
    script.async = true;
    script.referrerPolicy = 'no-referrer-when-downgrade';

    if(lastScript && lastScript.parentNode) {
      lastScript.parentNode.insertBefore(script, lastScript);
    } else {
      document.body.appendChild(script);
    }
    
    setTimeout(async () => {
        try {
        const userDocRef = doc(firestore, 'users', user.uid);
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
            throw 'User document does not exist!';
            }

            const currentData = userDoc.data();
            const newOrBalance = (currentData.wallet?.orBalance || 0) + REWARD_AMOUNT;

            transaction.update(userDocRef, {
            'wallet.orBalance': newOrBalance,
            });
        });

        toast({
            title: 'Success!',
            description: `You have earned ${REWARD_AMOUNT} OR coins.`,
        });
        onOpenChange(false);
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
    }, SUBMIT_DELAY * 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solve the Captcha</DialogTitle>
          <DialogDescription>Enter the characters you see below to earn OR coins.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-full select-none rounded-md border bg-muted p-4 text-center font-mono text-2xl tracking-widest">
              {captchaText}
            </div>
            <Button variant="ghost" size="icon" onClick={refreshCaptcha} disabled={isSubmitting}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="captcha-input">Enter Captcha</Label>
            <Input
              id="captcha-input"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Your answer"
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || !userInput}>
            {isSubmitting
              ? `Please wait ${countdown}s`
              : 'Submit & Earn 3 OR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
