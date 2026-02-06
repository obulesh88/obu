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

const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA";

async function startAdSession(gameId: string, userId: string, division: 'A' | 'B' | 'C') {
  try {
    const response = await fetch(
      "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ad",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ userId, gameId, division })
      }
    );

    const data = await response.json();
    if (data.success) {
      return data;
    }
    return null;
  } catch (err) {
    console.error("Error calling ad function:", err);
    return null;
  }
}

interface AdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  gameId: string;
  division: 'A' | 'B' | 'C';
}

export function AdDialog({ open, onOpenChange, onComplete, gameId, division }: AdDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [status, setStatus] = useState('Click "Watch Ad" to begin.');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [isWatchButtonDisabled, setIsWatchButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasStartedWatching, setHasStartedWatching] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

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
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (hasStartedWatching && countdown > 0) {
      timer = setInterval(() => {
        // Only count down while the user is away from the app (looking at the ad)
        if (document.visibilityState === 'hidden') {
          setCountdown((prev) => Math.max(0, prev - 1));
          setStatus("Ad in progress. Keep watching...");
        } else {
          setStatus("Timer Paused. Please return to the ad!");
        }
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

    // Open window immediately to avoid popup blocker
    const adWindow = window.open('about:blank', '_blank');
    setStatus('Connecting to ad server...');
    setIsWatchButtonDisabled(true);

    const result = await startAdSession(gameId, user.uid, division);
    
    if (result && result.success) {
        const adUrl = result.adUrl || 'https://multicoloredsister.com/bh3bV.0kPm3EpQv/bpmRVOJsZfDC0h2vNfz/QS2/OnTJgL2dL-TvYS3/NiDFYg5hOVDgcd';
        if (adWindow) adWindow.location.href = adUrl;
        
        setHasStartedWatching(true);
        setCountdown(WATCH_DELAY);
        setStatus(`Watching ad...`);
    } else {
        if (adWindow) adWindow.close();
        setStatus('Failed to start ad. Please try again.');
        setIsWatchButtonDisabled(false);
        toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'Could not initialize ad session.'
        });
    }
  };

  const handleClaimReward = () => {
    if (!user || !firestore) return;
    
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
        description: `You earned ${REWARD_AMOUNT} OR coins.`,
    });
    
    onComplete();
    onOpenChange(false);
    setIsClaiming(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>🎥 Watch Ad & Earn</DialogTitle>
          <DialogDescription>
            Watch an ad for {WATCH_DELAY} seconds. The timer only counts down while you are looking at the ad.
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-center font-semibold p-6 border rounded-md bg-muted flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <span className={!isTabVisible && countdown > 0 ? "text-primary animate-pulse" : ""}>{status}</span>
            {countdown > 0 && (
              <span className="text-4xl font-mono text-primary">{countdown}s</span>
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
