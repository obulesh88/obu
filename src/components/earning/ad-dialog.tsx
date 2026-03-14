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
import { Gamepad2, Tv } from 'lucide-react';

const DEFAULT_REWARD = 5;
const WATCH_DELAY = 15; // 15 seconds

const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA";

async function startAdSession(userId: string, division: 'A' | 'B' | 'C') {
  let endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ad";
  if (division === 'B') endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ads-2";
  if (division === 'C') endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ads-3";

  try {
    const response = await fetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ userId })
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
  rewardAmount?: number;
  gameUrl?: string;
}

export function AdDialog({ open, onOpenChange, onComplete, division, rewardAmount = DEFAULT_REWARD, gameUrl }: AdDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [status, setStatus] = useState('Click to begin.');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [isStartButtonDisabled, setIsStartButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(gameUrl ? 'Click "Play Game" to start.' : 'Click "Watch Ad" to begin.');
      setShowClaimButton(false);
      setIsClaiming(false);
      setIsStartButtonDisabled(false);
      setCountdown(0);
      setHasStarted(false);
    }
  }, [open, gameUrl]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (hasStarted && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
        setStatus(gameUrl ? "Enjoy the game!" : "Ad in progress. Keep watching...");
      }, 1000);
    } else if (hasStarted && countdown === 0) {
      setShowClaimButton(true);
      setStatus("Mission accomplished! You can now claim your reward.");
    }
    
    return () => clearInterval(timer);
  }, [countdown, hasStarted, gameUrl]);


  const handleStart = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }

    // Always open the ad window for tracking if it's a standard ad division
    const adWindow = window.open('about:blank', '_blank');
    setStatus('Connecting...');
    setIsStartButtonDisabled(true);

    const result = await startAdSession(user.uid, division);
    
    if (result && result.success) {
        const adUrl = result.adUrl;
        if (adWindow) adWindow.location.href = adUrl;
        
        setHasStarted(true);
        setCountdown(WATCH_DELAY);
        setStatus(gameUrl ? `Playing...` : `Watching ad...`);
    } else {
        if (adWindow) adWindow.close();
        setStatus('Connection failed. Please try again.');
        setIsStartButtonDisabled(false);
        toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'Could not initialize session.'
        });
    }
  };

  const handleClaimReward = () => {
    if (!user || !firestore) return;
    
    setIsClaiming(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const updateData = {
        'wallet.orBalance': increment(rewardAmount),
        'watchAds.verifiedAt': serverTimestamp(),
        'watchAds.ad_completed': true,
        'watchAds.reward_comm': rewardAmount,
        'updatedAt': serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
        .then(() => {
            toast({
                title: 'Success!',
                description: `You earned ${rewardAmount} OR coins.`,
            });
            onComplete();
            onOpenChange(false);
            setIsClaiming(false);
        })
        .catch(async (error: any) => {
            setIsClaiming(false);
            if (error.code === 'permission-denied') {
              const permissionError = new FirestorePermissionError({
                  path: userDocRef.path,
                  operation: 'update',
                  requestResourceData: updateData,
              } satisfies SecurityRuleContext);
              errorEmitter.emit('permission-error', permissionError);
            }
        });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {gameUrl ? <Gamepad2 className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
            {gameUrl ? 'Play & Earn' : 'Watch Ad & Earn'}
          </DialogTitle>
          <DialogDescription>
            {gameUrl ? 'Play the game for at least 15 seconds to unlock your reward.' : `Watch an ad for ${WATCH_DELAY} seconds to earn rewards.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-muted relative">
            {hasStarted && gameUrl ? (
              <iframe 
                src={gameUrl} 
                className="absolute inset-0 w-full h-full border-0" 
                allowFullScreen
              />
            ) : (
              <div className="text-center p-6 flex flex-col items-center justify-center gap-4">
                 <span className={countdown > 0 ? "text-primary animate-pulse font-bold" : "font-medium"}>{status}</span>
                 {countdown > 0 && (
                   <span className="text-5xl font-black font-mono text-primary drop-shadow-sm">{countdown}s</span>
                 )}
              </div>
            )}
            
            {/* Overlay timer when playing game */}
            {hasStarted && gameUrl && countdown > 0 && (
              <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
                 <div className="bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10">
                    Reward Unlocks in: {countdown}s
                 </div>
              </div>
            )}
        </div>

        <DialogFooter className='p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 bg-background border-t'>
          <Button type="button" size="lg" onClick={handleStart} disabled={isStartButtonDisabled || (hasStarted && countdown > 0)}>
             {hasStarted && countdown > 0 ? 'In Progress...' : (gameUrl ? '🎮 Play Game' : '▶ Watch Ad')}
          </Button>
          {showClaimButton && (
            <Button type="button" size="lg" variant="default" onClick={handleClaimReward} disabled={isClaiming} className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg">
                {isClaiming ? 'Claiming...' : '✔ Claim Reward'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
