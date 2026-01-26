'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { GameCaptchaDialog } from '@/components/earning/game-captcha-dialog';

const NUM_GAMES = 8;
const REWARD_PER_SESSION = 3;
const GAME_DURATION = 30; // 30 seconds

const games = [
    { name: "Count Rush", url: "https://html5.gamemonetize.co/hbvt6ecfxfrtu62sm0km7c1gs23be5c2/" },
    { name: "Line Color Puzzle", url: "https://html5.gamemonetize.co/m4o7lueza84sd0qy0wrn991ups3x1l64/" },
    { name: "Bubble Shooter Relaxing Puzzle", url: "https://html5.gamemonetize.co/tv66qo5zdz26osoqx597umvqyuaov0cs/" },
    { name: "My Cat Restaurant", url: "https://html5.gamemonetize.co/zro5d0oom4aubos4mlka610s5mla0zt3/" },
    { name: "Memory Emoji", url: "https://html5.gamemonetize.co/3s56bhfz1vc2njsrlqzgnfs9m2r9eabf/" },
    { name: "Gear Shift Race", url: "https://html5.gamemonetize.co/bwxvpns0l9v0vxqcsj2v5uw6ummx54zr/" },
    { name: "Cube Merge", url: "https://html5.gamemonetize.co/nkjtibnj0tezzvci3owaf2dtff3hvfvq/" },
    { name: "Poker", url: "https://html5.gamemonetize.co/f5mv3cltk9bjta0h3t54c1isiqwlxgf3/" },
];

// --- Verification Logic ---
const CLAIM_COINS_URL = 'https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/claim-coins';
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA';

const claimCoinsAfterTimer = async (claimData: any) => {
  const response = await fetch(
    CLAIM_COINS_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BEARER_TOKEN}`
      },
      body: JSON.stringify(claimData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Failed to claim coins. Status: ${response.status}`);
  }
  return response.json();
};
// --- End of Verification Logic ---

export default function GamesPage() {
  const { toast } = useToast();
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { setBottomNavVisible } = useLayout();

  const [isClient, setIsClient] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ game: any; index: number } | null>(null);
  const [timers, setTimers] = useState<number[]>(Array(NUM_GAMES).fill(0));
  const [isPlaying, setIsPlaying] = useState<boolean[]>(Array(NUM_GAMES).fill(false));
  const [sessionEarnings, setSessionEarnings] = useState<number[]>(Array(NUM_GAMES).fill(0));
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const intervalRefs = useRef<(NodeJS.Timeout | null)[]>(Array(NUM_GAMES).fill(null));

  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [verifyingGameIndex, setVerifyingGameIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    return () => {
      intervalRefs.current.forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  useEffect(() => {
    if (selectedGame) {
      setBottomNavVisible(false);
    } else {
      setBottomNavVisible(true);
    }

    return () => {
      setBottomNavVisible(true);
    };
  }, [selectedGame, setBottomNavVisible]);


  const handlePlayGame = (index: number) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    if (isPlaying[index]) {
      toast({ title: "Game in progress", description: "Please wait for the current session to end." });
      return;
    }
    
    setSessionEarnings(prev => {
        const newEarnings = [...prev];
        newEarnings[index] = 0;
        return newEarnings;
    });

    setIsPlaying(prev => {
        const newIsPlaying = [...prev];
        newIsPlaying[index] = true;
        return newIsPlaying;
    });
    setTimers(prev => {
        const newTimers = [...prev];
        newTimers[index] = GAME_DURATION;
        return newTimers;
    });

    if (games[index].name === 'My Cat Restaurant' || games[index].name === "Line Color Puzzle" || games[index].name === "Bubble Shooter Relaxing Puzzle" || games[index].name === "Count Rush" || games[index].name === "Memory Emoji" || games[index].name === "Gear Shift Race" || games[index].name === "Cube Merge" || games[index].name === "Poker") {
      setSelectedGame({ game: games[index], index });
    } else {
      window.open(games[index].url, '_blank');
    }

    if (intervalRefs.current[index]) {
      clearInterval(intervalRefs.current[index]!);
    }

    intervalRefs.current[index] = setInterval(() => {
      setTimers(prevTimers => {
        const newTimers = [...prevTimers];
        const currentTime = newTimers[index];

        if (currentTime <= 0) {
            if (intervalRefs.current[index]) {
                clearInterval(intervalRefs.current[index]!);
                intervalRefs.current[index] = null;
            }
            setIsPlaying(prevIsPlaying => {
                const newIsPlaying = [...prevIsPlaying];
                newIsPlaying[index] = false;
                return newIsPlaying;
            });
            if (selectedGame?.index === index) {
                setSelectedGame(null);
            }
            setSessionEarnings(prev => {
                const newEarnings = [...prev];
                newEarnings[index] = REWARD_PER_SESSION;
                return newEarnings;
            });
            setVerifyingGameIndex(index);
            setIsCaptchaOpen(true);
            return newTimers;
        }
        
        const newTime = currentTime - 1;
        newTimers[index] = newTime;
        
        return newTimers;
      });
    }, 1000);
  };

  const handleClaimReward = async () => {
    if (!user || !firestore || verifyingGameIndex === null) return;
    
    const rewardAmount = sessionEarnings[verifyingGameIndex];
    if (rewardAmount <= 0) {
        toast({ variant: 'destructive', title: "No reward to claim." });
        setIsCaptchaOpen(false);
        setVerifyingGameIndex(null);
        return;
    }

    try {
      // API verification step
      await claimCoinsAfterTimer({
        coins: rewardAmount,
      });
        
      const userDocRef = doc(firestore, 'users', user.uid);
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw 'User document does not exist!';
        }
        const newOrBalance = (userDoc.data().wallet?.orBalance || 0) + rewardAmount;
        transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
      });

      // Log the transaction
      if (verifyingGameIndex !== null) {
          const transactionsColRef = collection(firestore, 'users', user.uid, 'transactions');
          await addDoc(transactionsColRef, {
              userId: user.uid,
              amount: rewardAmount,
              type: 'game',
              description: `Played ${games[verifyingGameIndex].name}`,
              createdAt: serverTimestamp(),
              playTimeInSeconds: GAME_DURATION,
          });
      }

      toast({
        title: 'Reward Claimed!',
        description: `You've earned ${rewardAmount} OR for playing ${games[verifyingGameIndex].name}.`,
      });
    } catch (error: any) {
      console.error("Verification API call failed:", error);
      let description = 'Could not claim reward. Please try again.';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          description = 'A network error occurred. Please check your browser\'s developer console for CORS issues and ensure the backend is configured to accept requests from this domain.';
      } else if (error.message) {
          description = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: description,
      });
    } finally {
        setIsCaptchaOpen(false);
        if (verifyingGameIndex !== null) {
            setSessionEarnings(prev => {
                const newEarnings = [...prev];
                newEarnings[verifyingGameIndex] = 0;
                return newEarnings;
            });
        }
        setVerifyingGameIndex(null);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (selectedGame) {
    return (
        <div ref={gameContainerRef} className="relative w-full h-[calc(100vh-120px)] bg-black">
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4 z-[60] rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
                onClick={() => setSelectedGame(null)}
            >
                <ArrowLeft className="h-6 w-6" />
                <span className="sr-only">Back to games</span>
            </Button>
            <div className="absolute top-4 right-4 z-[60] rounded-full bg-black/50 px-4 py-2 text-white font-mono text-lg">
                {formatTime(timers[selectedGame.index])}
            </div>
            <iframe
                src={selectedGame.game.url}
                className="w-full h-full border-0"
                allow="autoplay"
            />
        </div>
    );
  }

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
            <CardTitle>Play Games & Earn</CardTitle>
            <CardDescription>
                <ul className="list-disc space-y-2 pl-5 mt-4 text-sm text-muted-foreground">
                    <li>Choose any game to start a 30-second session.</li>
                    <li>After the session ends, you must solve a captcha to claim your 3 OR reward.</li>
                    <li>Do not close or refresh the game to ensure you can claim your reward.</li>
                </ul>
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: NUM_GAMES }).map((_, index) => (
                <Card key={index} className="p-4 flex flex-col items-center justify-center text-center">
                    <Skeleton className="h-10 w-10 mb-4" />
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-10 w-28 mt-4" />
                </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
        <CardHeader>
            <CardTitle>Play Games & Earn</CardTitle>
            <CardDescription>
                <ul className="list-disc space-y-2 pl-5 mt-4 text-sm text-muted-foreground">
                    <li>Choose any game to start a 30-second session.</li>
                    <li>After the session ends, you must solve a captcha to claim your 3 OR reward.</li>
                    <li>Do not close or refresh the game to ensure you can claim your reward.</li>
                </ul>
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {games.map((game, index) => (
                    <Card key={index} className="flex flex-col items-center justify-center text-center p-4">
                        <Gamepad2 className="h-10 w-10 text-primary mb-4" />
                        <p className="font-semibold mb-2">{game.name}</p>
                        <Button 
                            onClick={() => handlePlayGame(index)}
                            className="w-full mt-4"
                            disabled={isPlaying[index]}
                        >
                            {isPlaying[index] ? `Playing... (${formatTime(timers[index])})` : 'Play Game'}
                        </Button>
                    </Card>
                ))}
            </div>
        </CardContent>
    </Card>
    <GameCaptchaDialog
        open={isCaptchaOpen}
        onOpenChange={setIsCaptchaOpen}
        onVerify={handleClaimReward}
    />
    </>
  );
}
