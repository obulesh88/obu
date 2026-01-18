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

const REWARD_AMOUNT = 10;
const WATCH_DELAY = 15; // 15 seconds to watch
const COOLDOWN_DELAY = 60; // 60 seconds cooldown

// Ad rotation setup from user's script
const ads = [
  { name: "monetag", url: "https://otieu.com/4/10481723" },
  { name: "propeller", url: "//djxh1.com/4/10481073?var={your_source_id}" },
  { name: "hilltop", url: "https://multicoloredsister.com/a7gvfy" }
];

// Helper functions from user's script
function getFingerprint() {
  if (typeof window === 'undefined') return '';
  return btoa(
    navigator.userAgent +
    screen.width +
    screen.height +
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

async function getIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return "unknown";
  }
}

function getNextAd(userId: string) {
    let url = "//djxh1.com/4/10481073?var={your_source_id}"; // default
    if (typeof window !== 'undefined') {
        let i = localStorage.getItem("ad_index");
        i = i ? parseInt(i) : 0;
        const ad = ads[i];
        localStorage.setItem("ad_index", ((i + 1) % ads.length).toString());
        url = ad.url.replace('{your_source_id}', userId);
        return { ...ad, url };
    }
    return { name: 'propeller', url: url.replace('{your_source_id}', userId) };
}


export function AdDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [status, setStatus] = useState('Click "Watch Ad" to begin.');
  const [isWatching, setIsWatching] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsWatching(false);
      setIsClaiming(false);
      setCountdown(0);
      setStatus('Click "Watch Ad" to begin.');

      const lastWatch = localStorage.getItem("last_watch");
      if(lastWatch && (Date.now() - parseInt(lastWatch)) < COOLDOWN_DELAY * 1000) {
        setIsWatching(true); // Effectively disables the button
        const remaining = Math.ceil((COOLDOWN_DELAY * 1000 - (Date.now() - parseInt(lastWatch))) / 1000);
        setStatus(`Cooldown active. Please wait ${remaining}s.`);
      }
    }
  }, [open]);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isWatching && countdown === 0 && status.startsWith('Ad opened')) {
      setStatus('You can now claim your reward.');
    }
    return () => clearTimeout(timer);
  }, [countdown, isWatching, status]);


  const handleWatchAd = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
    }
    
    const lastWatch = localStorage.getItem("last_watch");
    if (lastWatch && (Date.now() - parseInt(lastWatch)) < COOLDOWN_DELAY * 1000) {
        const remaining = Math.ceil((COOLDOWN_DELAY * 1000 - (Date.now() - parseInt(lastWatch))) / 1000);
        toast({ title: `Cooldown active. Please wait ${remaining} seconds.` });
        return;
    }

    setIsWatching(true);
    
    const ad = getNextAd(user.uid);
    const ip = await getIP();
    const fp = getFingerprint();

    localStorage.setItem("ad_start", Date.now().toString());
    localStorage.setItem("last_watch", Date.now().toString());
    localStorage.setItem("ad_ip", ip);
    localStorage.setItem("ad_fp", fp);

    setStatus(`Ad opened (${ad.name}). Wait ${WATCH_DELAY} seconds.`);
    setCountdown(WATCH_DELAY);
    
    window.open(ad.url, "_blank");

    setTimeout(() => setIsWatching(false), COOLDOWN_DELAY * 1000);
  };

  const handleClaimReward = async () => {
    if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Not Authenticated or Firebase not ready' });
        return;
    }
    
    setIsClaiming(true);

    const start = localStorage.getItem("ad_start");
    if (!start) {
        toast({ variant: 'destructive', title: "Please watch an ad first." });
        setIsClaiming(false);
        return;
    }

    const diff = (Date.now() - parseInt(start)) / 1000;
    if (diff < WATCH_DELAY) {
        toast({ variant: 'destructive', title: "Ad not completed", description: `Please wait ${Math.ceil(WATCH_DELAY - diff)} more seconds.` });
        setIsClaiming(false);
        return;
    }

    const ipNow = await getIP();
    const fpNow = getFingerprint();

    if (
        ipNow !== localStorage.getItem("ad_ip") ||
        fpNow !== localStorage.getItem("ad_fp")
    ) {
        toast({ variant: 'destructive', title: "Cheat Detected", description: "Your session information changed." });
        setIsClaiming(false);
        return;
    }
    
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw 'User document does not exist!';
        }

        const currentData = userDoc.data();
        const newOrBalance = (currentData.wallet?.orBalance || 0) + REWARD_AMOUNT;

        transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
      });

      toast({
        title: 'Success!',
        description: `You have earned ${REWARD_AMOUNT} OR coins.`,
      });

      localStorage.removeItem("ad_start");
      localStorage.removeItem("ad_ip");
      localStorage.removeItem("ad_fp");
      
      onOpenChange(false);

    } catch (error: any) {
      console.error('Failed to award points: ', error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Could not award points. Please try again.',
      });
    } finally {
      setIsClaiming(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Watch Ad to Earn</DialogTitle>
          <DialogDescription>
            Watch an ad for {WATCH_DELAY} seconds, then claim your reward. There is a {COOLDOWN_DELAY} second cooldown between ads.
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-center font-semibold p-4 border rounded-md bg-muted">
            {status}
            {countdown > 0 && ` (${countdown}s)`}
        </div>

        <DialogFooter className='grid grid-cols-2 gap-4'>
          <Button type="button" onClick={handleWatchAd} disabled={isWatching}>
             ▶ Watch Ad
          </Button>
          <Button type="button" onClick={handleClaimReward} disabled={isClaiming || countdown > 0}>
             ✔ Claim Reward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
