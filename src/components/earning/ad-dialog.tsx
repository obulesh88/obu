'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const REWARD_AMOUNT = 5;
const WATCH_DELAY = 15; // 15 seconds
const DAILY_AD_LIMIT = 10;

// Ad rotation setup
const ads = [
  "https://otieu.com/4/10481723",                // Monetag
  "//djxh1.com/4/10481073?var={your_source_id}", // PropellerAds
  "https://multicoloredsister.com/a7gvfy"        // HilltopAds
];

function getNextAd(userId: string): string {
    if (typeof window === 'undefined' || !userId) return ads[0].replace('{your_source_id}', 'test-user');
    let i = parseInt(localStorage.getItem("adIndex") || "0");
    const link = ads[i].replace('{your_source_id}', userId);
    localStorage.setItem("adIndex", String((i + 1) % ads.length));
    return link;
}

function fingerprint(): string {
    if (typeof window === 'undefined') return '';
    return btoa(
        navigator.userAgent +
        screen.width +
        screen.height +
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
}

let adStartTime = 0;

export function AdDialog({ open, onOpenChange, onComplete }: { open: boolean; onOpenChange: (open: boolean) => void; onComplete: () => void; }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [status, setStatus] = useState('Click "Watch Ad" to begin.');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [isWatchButtonDisabled, setIsWatchButtonDisabled] = useState(false);

  // 1. Daily Reset
  useEffect(() => {
    if (open) {
      const today = new Date().toDateString();
      if (localStorage.getItem("lastDay") !== today) {
        localStorage.setItem("lastDay", today);
        localStorage.setItem("dailyAds", "0");
      }
      // Reset dialog state
      setStatus('Click "Watch Ad" to begin.');
      setShowClaimButton(false);
      setIsClaiming(false);
      setIsWatchButtonDisabled(false);
    }
  }, [open]);


  // 4. Limits Check
  const canWatch = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const dailyAds = parseInt(localStorage.getItem("dailyAds") || "0");
    if (dailyAds >= DAILY_AD_LIMIT) {
      toast({ variant: 'destructive', title: "Daily limit reached", description: "You have watched the maximum number of ads for today." });
      return false;
    }
    return true;
  }, [toast]);

  // 5. Watch Ad
  const handleWatchAd = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    if (!canWatch()) return;

    adStartTime = Date.now();
    localStorage.setItem('ad_fp', fingerprint()); // Store fingerprint on watch
    
    setStatus(`Watching ad... please wait ${WATCH_DELAY} seconds.`);
    setShowClaimButton(false);
    setIsWatchButtonDisabled(true);

    // const link = getNextAd(user.uid);
    // window.open(link, "_blank");

    setTimeout(() => {
      setShowClaimButton(true);
      setStatus("You can now claim your reward.");
    }, WATCH_DELAY * 1000);
  };

  // 6. Claim Reward
  const handleClaimReward = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Authentication error' });
        return;
    }
    if (Date.now() - adStartTime < WATCH_DELAY * 1000) {
        toast({ variant: 'destructive', title: "Please wait full ad time" });
        return;
    }
    // Anti-cheat check
    if (fingerprint() !== localStorage.getItem('ad_fp')) {
        toast({ variant: 'destructive', title: "Cheat Detected", description: "Your session information changed." });
        onOpenChange(false);
        return;
    }

    setIsClaiming(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
            }
            const currentData = userDoc.data();
            const newOrBalance = (currentData?.wallet?.orBalance || 0) + REWARD_AMOUNT;
            transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
        });

      const adsWatched = parseInt(localStorage.getItem("dailyAds") || "0");
      localStorage.setItem("dailyAds", String(adsWatched + 1));
      
      toast({
        title: 'Success!',
        description: `You have earned ${REWARD_AMOUNT} OR coins.`,
      });
      onComplete();
      onOpenChange(false);

    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { 'wallet.orBalance': `(balance) + ${REWARD_AMOUNT}` }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error('Failed to award points: ', error);
            toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: error.message || 'Could not award points.',
            });
        }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🎥 Watch Ad & Earn</DialogTitle>
          <DialogDescription>
            Watch an ad for {WATCH_DELAY} seconds, then claim your reward of {REWARD_AMOUNT} OR coins.
            You can watch up to {DAILY_AD_LIMIT} ads per day.
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-center font-semibold p-4 border rounded-md bg-muted">
            {status}
        </div>

        <DialogFooter className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Button type="button" onClick={handleWatchAd} disabled={isWatchButtonDisabled}>
             ▶ Watch Ad
          </Button>
          {showClaimButton && (
            <Button type="button" onClick={handleClaimReward} disabled={isClaiming}>
                {isClaiming ? 'Claiming...' : '✔ Submit / Claim'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
