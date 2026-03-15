
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Gamepad2, Tv, Timer, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_REWARD = 5;
const DEFAULT_WATCH_DELAY = 15;

const OLD_AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA";
const NEW_AUTH_TOKEN_A = "cfa5ae94457b84ebfa62afb7b495ee588477ce82425d69be0040fb833a0f81be";
const DIV_A_AD_URL = "https://omg10.com/4/10481723";
const DIV_B_AD_URL = "https://rm358.com/4/10481073?var=";
const DIV_C_AD_URL = "https://bony-teaching.com/bs3qVf0.Pt3BpWv/b/mcVjJnZ/DN0q2BNjzFQj2kOnTIgd2ALlTHYj3FNUDzYG5yOfDacH";

async function startAdSession(userId: string, division: 'A' | 'B' | 'C') {
  let endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ad";
  let token = OLD_AUTH_TOKEN;
  let body: any = { userId };
  let redirectUrl = "https://google.com";

  if (division === 'A') {
    endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ad";
    token = NEW_AUTH_TOKEN_A;
    body = { user_id: userId };
    redirectUrl = DIV_A_AD_URL;
  } else if (division === 'B') {
    endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ads-2";
    redirectUrl = `${DIV_B_AD_URL}${userId}`;
  } else if (division === 'C') {
    endpoint = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/start-ads-3";
    redirectUrl = DIV_C_AD_URL;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return { success: true, adUrl: redirectUrl };
  } catch (err) {
    return { success: false, adUrl: redirectUrl };
  }
}

function generateCaptcha() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
  gameId,
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
  const [needsVerification, setNeedsVerification] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [wasInterrupted, setWasInterrupted] = useState(false);

  const countdownRef = useRef(countdown);
  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  const resetVerification = useCallback(() => {
    setCaptchaText(generateCaptcha());
    setUserInput('');
    setIsVerified(false);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasStarted && countdownRef.current > 0) {
        setWasInterrupted(true);
        setHasStarted(false);
        setCountdown(0);
        setStatus("Interrupted! You returned too early. Please try again.");
        toast({
          variant: 'destructive',
          title: 'Task Interrupted',
          description: 'You must stay on the ad/task page for the full duration.',
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasStarted, toast]);

  useEffect(() => {
    if (open) {
      setStatus(gameUrl ? 'Ready to play?' : 'Ready to watch?');
      setShowClaimButton(false);
      setIsClaiming(false);
      setIsStartButtonDisabled(false);
      setCountdown(0);
      setHasStarted(false);
      setNeedsVerification(false);
      setIsVerified(false);
      setWasInterrupted(false);
    }
  }, [open, gameUrl]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasStarted && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (hasStarted && countdown === 0) {
      setNeedsVerification(true);
      resetVerification();
      setStatus("Mission accomplished! Complete verification to claim.");
    }
    return () => clearInterval(timer);
  }, [countdown, hasStarted, resetVerification]);

  const handleStart = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    setStatus('Connecting to session...');
    setIsStartButtonDisabled(true);
    setWasInterrupted(false);
    const data = await startAdSession(user.uid, division);
    if (data && data.adUrl) {
        window.open(data.adUrl, '_blank');
    }
    setHasStarted(true);
    setCountdown(playTimeSeconds);
    setStatus(gameUrl ? `Playing...` : `Watching ad...`);
  };

  const handleVerify = () => {
    if (userInput.toUpperCase() === captchaText) {
      setIsVerified(true);
      setNeedsVerification(false);
      setShowClaimButton(true);
      toast({ title: 'Verified!', description: 'You can now claim your reward.' });
    } else {
      toast({ variant: 'destructive', title: 'Incorrect Captcha' });
      resetVerification();
    }
  };

  const handleClaimReward = () => {
    if (!user || !firestore || !isVerified) return;
    setIsClaiming(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const updateData = {
        'wallet.orBalance': increment(rewardAmount),
        'updatedAt': serverTimestamp()
    };
    updateDoc(userDocRef, updateData)
        .then(() => {
            const transactionsRef = collection(firestore, 'transactions');
            addDoc(transactionsRef, {
                userId: user.uid,
                amount: rewardAmount,
                currency: 'OR',
                type: gameUrl ? 'game' : 'ad',
                description: gameUrl ? `Played Game: ${gameId}` : `Watched Ad: ${gameId}`,
                createdAt: serverTimestamp()
            });
            toast({ title: 'Reward Claimed!', description: `Added ${rewardAmount} OR to your wallet.` });
            onComplete();
            onOpenChange(false);
        })
        .catch(async (error: any) => {
            if (error.code === 'permission-denied') {
              const permissionError = new FirestorePermissionError({
                  path: userDocRef.path,
                  operation: 'update',
                  requestResourceData: updateData,
              } satisfies SecurityRuleContext);
              errorEmitter.emit('permission-error', permissionError);
            }
        })
        .finally(() => setIsClaiming(false));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isGameActive = hasStarted && gameUrl && countdown > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!hasStarted || showClaimButton || wasInterrupted) {
        onOpenChange(val);
      }
    }}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0 overflow-hidden transition-all duration-300 border-none bg-background [&>button]:hidden",
          isGameActive ? "sm:max-w-none w-screen h-screen rounded-none" : 
          gameUrl ? "sm:max-w-4xl h-[85vh] max-h-[85vh]" : "sm:max-w-2xl max-h-[80vh]"
        )} 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {!isGameActive && (
          <DialogHeader className="p-4 pb-2 bg-background border-b">
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
              {gameUrl ? <Gamepad2 className="h-5 w-5 text-primary" /> : <Tv className="h-5 w-5 text-primary" />}
              {gameUrl ? 'Gaming Task' : 'Ad Task'}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {gameUrl 
                ? `Play for ${formatTime(playTimeSeconds)} to earn ${rewardAmount} OR coins.` 
                : `Duration: ${playTimeSeconds}s. Reward: ${rewardAmount} OR.`}
            </DialogDescription>
          </DialogHeader>
        )}
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden">
            {isGameActive ? (
              <div className="w-full h-full relative">
                <iframe src={gameUrl} className="absolute inset-0 w-full h-full border-0" allow="autoplay; fullscreen; keyboard" />
                <div className="absolute top-0 left-0 w-full h-2 bg-white/5 z-[60]">
                   <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${((playTimeSeconds - countdown) / playTimeSeconds) * 100}%` }} />
                </div>
                {countdown > 0 && (
                  <div className="absolute top-6 right-6 pointer-events-none z-[60]">
                    <div className="bg-black/90 text-white px-6 py-3 rounded-2xl font-black text-3xl border border-white/10 shadow-2xl backdrop-blur-2xl flex items-center gap-4 animate-in fade-in zoom-in">
                      <Timer className="h-7 w-7 text-primary animate-pulse" />
                      <span className="font-mono tracking-tighter">{formatTime(countdown)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : needsVerification ? (
              <div className="w-full max-w-md p-8 bg-card rounded-2xl border shadow-2xl space-y-6 animate-in zoom-in-95 text-foreground">
                <div className="text-center space-y-2">
                  <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-black uppercase">Verify Human</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Solve this captcha to claim your {rewardAmount} OR</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-lg p-4 text-center font-mono text-3xl font-black tracking-widest select-none">
                      {captchaText}
                    </div>
                    <Button variant="outline" size="icon" className="h-14 w-14" onClick={resetVerification}>
                      <RefreshCw className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Enter Characters</Label>
                    <Input value={userInput} onChange={(e) => setUserInput(e.target.value.toUpperCase())} placeholder="TYPE HERE..." className="h-14 text-center font-mono text-xl tracking-widest uppercase font-bold" autoComplete="off" />
                  </div>
                  <Button onClick={handleVerify} disabled={!userInput} className="w-full h-14 font-black uppercase text-lg">Verify & Proceed</Button>
                </div>
              </div>
            ) : wasInterrupted ? (
              <div className="text-center p-8 space-y-6 animate-in fade-in zoom-in">
                <div className="bg-destructive/10 p-6 rounded-full inline-block border border-destructive/20">
                  <AlertCircle className="h-16 w-16 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase text-white">Reward Denied</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">You returned to the app before the timer finished. You must stay on the ad page to earn rewards.</p>
                </div>
                <Button onClick={handleStart} variant="destructive" className="h-12 px-8 font-black uppercase">Try Again</Button>
              </div>
            ) : (
              <div className="text-center p-12 flex flex-col items-center justify-center gap-8">
                 <div className="rounded-full bg-primary/10 p-10 animate-pulse border-4 border-primary/5">
                   {gameUrl ? <Gamepad2 className="h-20 w-20 text-primary" /> : <Tv className="h-20 w-20 text-primary" />}
                 </div>
                 <div className="space-y-4">
                   <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{status}</h3>
                   {countdown > 0 && !gameUrl && (
                     <p className="text-8xl font-black font-mono text-primary tracking-tighter">{countdown}s</p>
                   )}
                 </div>
              </div>
            )}
        </div>
        <DialogFooter className={cn("p-4 flex flex-col sm:flex-row gap-4 bg-background border-t", (isGameActive || needsVerification || wasInterrupted) && "hidden")}>
          {!hasStarted && (
             <Button type="button" size="lg" onClick={handleStart} className="flex-1 h-14 font-black uppercase tracking-tight text-xl rounded-xl shadow-xl active:scale-95 transition-all bg-primary hover:bg-primary/90">
                {gameUrl ? 'Play Now' : 'Watch Ad'}
             </Button>
          )}
          {showClaimButton && isVerified && (
            <Button type="button" size="lg" variant="default" onClick={handleClaimReward} disabled={isClaiming} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white border-none shadow-2xl font-black uppercase text-xl animate-in zoom-in-95 rounded-xl">
                {isClaiming ? 'Claiming...' : 'Claim Reward'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
