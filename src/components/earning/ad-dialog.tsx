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
import { Gamepad2, Tv, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_REWARD = 5;
const DEFAULT_WATCH_DELAY = 15;

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
  playTimeSeconds?: number;
}

export function AdDialog({ 
  open, 
  onOpenChange, 
  onComplete, 
  division, 
  rewardAmount = DEFAULT_REWARD, 
  gameUrl,
  playTimeSeconds = DEFAULT_WATCH_DELAY 
}: AdDialogProps) {
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
      setStatus(gameUrl ? "Time's up! You can now claim your reward." : "Mission accomplished! You can now claim your reward.");
    }
    
    return () => clearInterval(timer);
  }, [countdown, hasStarted, gameUrl]);


  const handleStart = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }

    // Always open the ad window for tracking
    const adWindow = window.open('about:blank', '_blank');
    setStatus('Connecting...');
    setIsStartButtonDisabled(true);

    const result = await startAdSession(user.uid, division);
    
    if (result && result.success) {
        const adUrl = result.adUrl;
        if (adWindow) adWindow.location.href = adUrl;
        
        setHasStarted(true);
        setCountdown(playTimeSeconds);
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
      <DialogContent className={cn(
        "flex flex-col p-0 overflow-hidden transition-all duration-300",
        gameUrl ? "sm:max-w-4xl h-[90vh]" : "sm:max-w-2xl max-h-[80vh]"
      )} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            {gameUrl ? <Gamepad2 className="h-5 w-5 text-primary" /> : <Tv className="h-5 w-5 text-primary" />}
            {gameUrl ? 'Play & Earn' : 'Watch Ad & Earn'}
          </DialogTitle>
          <DialogDescription>
            {gameUrl 
              ? `Play for at least ${playTimeSeconds} seconds to unlock your reward of ${rewardAmount} OR coins.` 
              : `Watch for ${playTimeSeconds} seconds to earn ${rewardAmount} OR coins.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 relative">
            {hasStarted && gameUrl ? (
              <div className="w-full h-full relative">
                <iframe 
                  src={gameUrl} 
                  className="absolute inset-0 w-full h-full border-0" 
                  allowFullScreen
                />
                
                {/* Fixed Overlay for Countdown */}
                {countdown > 0 && (
                  <div className="absolute top-4 right-4 pointer-events-none z-50">
                    <div className="bg-black/90 text-white px-4 py-2 rounded-xl font-black text-xl border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-2">
                      <Timer className="h-5 w-5 text-primary animate-pulse" />
                      {countdown}s
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-12 flex flex-col items-center justify-center gap-6">
                 <div className="rounded-full bg-primary/10 p-6">
                   {gameUrl ? <Gamepad2 className="h-12 w-12 text-primary" /> : <Tv className="h-12 w-12 text-primary" />}
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-xl font-bold">{status}</h3>
                   {countdown > 0 && (
                     <p className="text-6xl font-black font-mono text-primary tracking-tighter">{countdown}s</p>
                   )}
                 </div>
              </div>
            )}
        </div>

        <DialogFooter className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 bg-background border-t">
          <Button 
            type="button" 
            size="lg" 
            onClick={handleStart} 
            disabled={isStartButtonDisabled || (hasStarted && countdown > 0)}
            className="h-14 font-black uppercase tracking-tight text-lg"
          >
             {hasStarted && countdown > 0 ? 'In Progress...' : (gameUrl ? '🎮 Start Game' : '▶ Start Ad')}
          </Button>
          {showClaimButton && (
            <Button 
              type="button" 
              size="lg" 
              variant="default" 
              onClick={handleClaimReward} 
              disabled={isClaiming} 
              className="h-14 bg-green-600 hover:bg-green-700 text-white border-none shadow-xl font-black uppercase text-lg animate-in zoom-in-95"
            >
                {isClaiming ? 'Claiming...' : '✔ Claim Reward'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
