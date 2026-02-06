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
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error calling start-ad:", errorText);
      return null;
    }

    const data = await res.json();
    console.log("start-ad response:", data);
    return data;
  } catch (error) {
    console.error("Network error starting ad:", error);
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
  const [countdown, setCountdown] = useState(0);
  const [hasStartedWatching, setHasStartedWatching] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus('Click "Watch Ad" to begin.');
      setShowClaimButton(false);
      setIsClaiming(false);
      setIsWatchButtonDisabled(false);
      setCountdown(0);
      setHasStartedWatching(false);
    }
  }, [open]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (hasStartedWatching && countdown === 0) {
      setShowClaimButton(true);
      setStatus("You can now claim your reward.");
    }
    return () => clearInterval(timer);
  }, [countdown, hasStartedWatching]);


  const handleWatchAd = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }

    setStatus('Connecting to ad server...');
    setIsWatchButtonDisabled(true);

    const result = await startAd(gameId, user.uid);
    
    if (!result) {
        setStatus('Failed to start ad. Please try again.');
        setIsWatchButtonDisabled(false);
        toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'Could not initialize ad session. Check your internet connection.'
        });
        return;
    }

    // Trigger the ad to open in a new window/tab
    const adUrl = 'https://multicoloredsister.com/bh3bV.0kPm3EpQv/bpmRVOJsZfDC0h2vNfz/QS2/OnTJgL2dL-TvYS3/NiDFYg5hOVDgcd';
    window.open(adUrl, '_blank');

    setHasStartedWatching(true);
    setCountdown(WATCH_DELAY);
    setStatus(`Watching ad...`);
  };

  const handleClaimReward = () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Authentication error' });
        return;
    }
    
    // Safety check for timer
    if (countdown > 0) {
        toast({ variant: 'destructive', title: "Please wait for the timer to complete." });
        return;
    }

    setIsClaiming(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const updateData = {
        'wallet.orBalance': increment(REWARD_AMOUNT),
        'watchAds.verifiedAt': serverTimestamp(),
        'watchAds.ad_completed': true,
        'watchAds.reward_comm': REWARD_AMOUNT,
        'updatedAt': serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
        .catch(async (error: any) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updateData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });

    toast({
        title: 'Success!',
        description: `You have earned ${REWARD_AMOUNT} OR coins.`,
    });
    
    onComplete();
    onOpenChange(false);
    setIsClaiming(false);
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
        
        <div className="text-center font-semibold p-6 border rounded-md bg-muted flex flex-col items-center justify-center gap-2">
            <span>{status}</span>
            {countdown > 0 && (
              <span className="text-3xl font-mono text-primary animate-pulse">{countdown}s</span>
            )}
        </div>

        <DialogFooter className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Button type="button" onClick={handleWatchAd} disabled={isWatchButtonDisabled || (hasStartedWatching && countdown > 0)}>
             {hasStartedWatching && countdown > 0 ? 'Ad in Progress...' : '▶ Watch Ad'}
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
