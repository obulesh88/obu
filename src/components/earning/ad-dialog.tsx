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
  const [adStartTime, setAdStartTime] = useState(0);

  useEffect(() => {
    if (open) {
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

    setAdStartTime(Date.now());
    setStatus(`Watching ad... please wait ${WATCH_DELAY} seconds.`);

    setTimeout(() => {
      setShowClaimButton(true);
      setStatus("You can now claim your reward.");
    }, WATCH_DELAY * 1000);
  };

  const handleClaimReward = () => {
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
