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
const AD_WATCH_TIME = 5000; // 5 seconds

export function AdDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isAdWatched, setIsAdWatched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(AD_WATCH_TIME / 1000);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open) {
      setIsAdWatched(false);
      setIsSubmitting(false);
      setCountdown(AD_WATCH_TIME / 1000);

      timer = setTimeout(() => {
        setIsAdWatched(true);
      }, AD_WATCH_TIME);

      const countdownTimer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownTimer);
      };
    }
  }, [open]);

  const handleClaimReward = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to earn rewards.',
      });
      return;
    }

    if (!isAdWatched) {
        toast({
            variant: 'destructive',
            title: 'Please watch the ad',
            description: `You can claim your reward in ${countdown} seconds.`,
        });
        return;
    }

    setIsSubmitting(true);
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Watch Ad to Earn</DialogTitle>
          <DialogDescription>
            Watch the ad below. You can claim your reward in {countdown > 0 ? `${countdown} seconds` : 'now'}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center h-64 border rounded-md bg-muted">
           <div id="zone_201464"></div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleClaimReward} disabled={isSubmitting || !isAdWatched}>
            {isSubmitting ? 'Claiming...' : `Claim ${REWARD_AMOUNT} OR`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
