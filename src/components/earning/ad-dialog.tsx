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
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

const REWARD_AMOUNT = 5; // 5 OR coins for watching an ad
const SUBMIT_DELAY = 15; // 15 seconds

export function AdDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open) {
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

  const handleClaimReward = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to earn rewards.',
      });
      return;
    }

    setIsSubmitting(true);
    setCountdown(SUBMIT_DELAY);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Watch Ad to Earn</DialogTitle>
          <DialogDescription>
            Click the button to watch the ad. You will be rewarded after {SUBMIT_DELAY} seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center h-64 border rounded-md bg-muted">
           <div id="zone_201464"></div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleClaimReward} disabled={isSubmitting}>
            {isSubmitting
              ? `Please wait ${countdown}s`
              : `Watch Ad & Claim ${REWARD_AMOUNT} OR`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
