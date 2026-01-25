'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { doc, runTransaction } from 'firebase/firestore';
import { GameCaptchaDialog } from '@/components/earning/game-captcha-dialog';

const NUM_GAMES = 8;
const REWARD_PER_MINUTE = 6;
const GAME_DURATION = 300; // 5 minutes in seconds

const games = [
    { name: "Count Rush", url: "https://html5.gamemonetize.co/a2n82o95m2g0c8v0c6j10j5j1j3j0j/" },
    { name: "Line Color Puzzle", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Bubble Shooter Relaxing Puzzle", url: "https://html5.gamemonetize.co/9vj6k8jp3a0g4g5f3h0c7i6j5f2h5g/" },
    { name: "My Cat Restaurant", url: "https://html5.gamemonetize.co/zro5d0oom4aubos4mlka610s5mla0zt3/" },
    { name: "Game #5", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #6", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #7", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #8", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
];

export default function GamesPage() {
  const { toast } = useToast();
  const { user } = useUser();
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

    if (games[index].name === 'My Cat Restaurant') {
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
            setVerifyingGameIndex(index);
            setIsCaptchaOpen(true);
            return newTimers;
        }
        
        const newTime = currentTime - 1;
        newTimers[index] = newTime;
        
        if ((GAME_DURATION - newTime) % 60 === 0 && newTime < GAME_DURATION) {
             setSessionEarnings(prev => {
                const newEarnings = [...prev];
                newEarnings[index] += REWARD_PER_MINUTE;
                return newEarnings;
            });
        }
        
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
      const userDocRef = doc(firestore, 'users', user.uid);
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw 'User document does not exist!';
        }
        const newOrBalance = (userDoc.data().wallet?.orBalance || 0) + rewardAmount;
        transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
      });

      toast({
        title: 'Reward Claimed!',
        description: `You've earned ${rewardAmount} OR for playing ${games[verifyingGameIndex].name}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Could not award points. Please try again.',
      });
      console.error(error);
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
                    <li>Choose any game to start a 5-minute session.</li>
                    <li>Earn 6 OR for every minute you play.</li>
                    <li>Your earnings will be shown on the play button.</li>
                    <li>Do not close or refresh the game to ensure you get your reward.</li>
                    <li>You can play more games to earn more.</li>
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
                    <li>Choose any game to start a 5-minute session.</li>
                    <li>Earn 6 OR for every minute you play.</li>
                    <li>Your earnings will be shown on the play button.</li>
                    <li>Do not close or refresh the game to ensure you get your reward.</li>
                    <li>You can play more games to earn more.</li>
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
                            {isPlaying[index] ? `Playing... (${formatTime(timers[index])}) | ${sessionEarnings[index]} OR` : 'Play Game'}
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
