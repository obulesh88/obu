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

const REWARD_AMOUNT = 5; // OR coins
const AD_VIEW_TIME = 5; // seconds

export function AdDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [countdown, setCountdown] = useState(AD_VIEW_TIME);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open) {
      setCanClaim(false);
      setCountdown(AD_VIEW_TIME);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanClaim(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Watch Ad & Earn</DialogTitle>
          <DialogDescription>Watch the ad below to earn OR coins.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center rounded-md border bg-muted p-4 text-center min-h-[250px]">
            {/* 
              This is a placeholder for your ad.
              You will need to replace this with your actual Google AdSense ad unit code.
              For example:
              <ins className="adsbygoogle"
                   style={{ display: 'block' }}
                   data-ad-client="ca-pub-XXXXXXXXXXXX"
                   data-ad-slot="YYYYYYYYYY"
                   data-ad-format="auto"
                   data-full-width-responsive="true"></ins>
              <Script id="adsense-script-injector">
                (adsbygoogle = window.adsbygoogle || []).push({});
              </Script>
            */}
            <p className="text-muted-foreground">Ad Placeholder</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleClaimReward} disabled={isSubmitting || !canClaim}>
            {isSubmitting ? 'Claiming...' : canClaim ? `Claim ${REWARD_AMOUNT} OR` : `Please wait ${countdown}s`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
