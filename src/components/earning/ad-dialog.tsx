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
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const REWARD_AMOUNT = 5;
const WATCH_DELAY = 15; // 15 seconds

const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA";

async function startAd(gameId: string, userId: string) {
  try {
    const res = await fetch(
      "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ad",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
          "apikey": ANON_KEY
        },
        body: JSON.stringify({ gameId, userId })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Error calling start-ad:", data);
      return null;
    }

    console.log("start-ad response:", data);
    return data;
  } catch (error) {
    console.error("Error calling start-ad:", error);
    return null;
  }
}

interface AdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  gameId: string;
}

export function AdDialog({ open, onOpenChange, onComplete, gameId }: AdDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [status, setStatus] = useState('Click "Watch Ad" to begin.');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [isWatchButtonDisabled, setIsWatchButtonDisabled] = useState(false);
  const [adStartTime, setAdStartTime] = useState(0);

  useEffect(() => {
    if (open) {
      // Reset dialog state on open
      setStatus('Click "Watch Ad" to begin.');
      setShowClaimButton(false);
      setIsClaiming(false);
      setIsWatchButtonDisabled(false);
    }
  }, [open]);


  const handleWatchAd = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }

    // Call the Supabase Edge Function to start the ad session
    await startAd(gameId, user.uid);

    setAdStartTime(Date.now());
    
    setStatus(`Watching ad... please wait ${WATCH_DELAY} seconds.`);
    setShowClaimButton(false);
    setIsWatchButtonDisabled(true);

    setTimeout(() => {
      setShowClaimButton(true);
      setStatus("You can now claim your reward.");
    }, WATCH_DELAY * 1000);
  };

  const handleClaimReward = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Authentication error' });
        return;
    }
    if (Date.now() - adStartTime < WATCH_DELAY * 1000) {
        toast({ variant: 'destructive', title: "Please wait full ad time" });
        return;
    }

    setIsClaiming(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
        await updateDoc(userDocRef, {
            'wallet.orBalance': increment(REWARD_AMOUNT),
            'watchAds.verifiedAt': serverTimestamp(),
            'watchAds.ad_completed': true,
            'watchAds.reward_comm': REWARD_AMOUNT,
            'updatedAt': serverTimestamp()
        });

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
                requestResourceData: { 
                    'wallet.orBalance': `increment(${REWARD_AMOUNT})`,
                    'watchAds.verifiedAt': '(now)',
                    'watchAds.ad_completed': true,
                    'watchAds.reward_comm': REWARD_AMOUNT,
                    'updatedAt': '(now)',
                }
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
