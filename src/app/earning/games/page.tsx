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

const NUM_GAMES = 8;
const REWARD_PER_GAME = 50;
const GAME_DURATION = 300; // 5 minutes in seconds

const games = [
    { name: "Count Rush", url: "https://html5.gamemonetize.co/a2n82o95m2g0c8v0c6j10j5j1j3j0j/" },
    { name: "Line Color Puzzle", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Bubble Shooter Relaxing Puzzle", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
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
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const intervalRefs = useRef<(NodeJS.Timeout | null)[]>(Array(NUM_GAMES).fill(null));

  useEffect(() => {
    setIsClient(true);
    return () => {
      intervalRefs.current.forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  useEffect(() => {
    const gameElement = gameContainerRef.current;

    const lockAndFullscreen = async () => {
      if (!gameElement) return;
      try {
        if (gameElement.requestFullscreen) {
          await gameElement.requestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {
        console.warn('Could not enter fullscreen or lock orientation.', e);
      }
    };

    const unlockAndExitFullscreen = async () => {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn('Could not exit fullscreen or unlock orientation.', e);
      }
    };

    if (selectedGame) {
      setBottomNavVisible(false);
      if (selectedGame.game.name === 'My Cat Restaurant') {
        lockAndFullscreen();
      }
    } else {
      setBottomNavVisible(true);
      unlockAndExitFullscreen();
    }

    return () => {
      setBottomNavVisible(true);
      unlockAndExitFullscreen();
    };
  }, [selectedGame, setBottomNavVisible]);

  const handleAwardPoints = async (index: number) => {
    if (!user || !firestore) return;

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw 'User document does not exist!';
        }
        const newOrBalance = (userDoc.data().wallet?.orBalance || 0) + REWARD_PER_GAME;
        transaction.update(userDocRef, { 'wallet.orBalance': newOrBalance });
      });

      toast({
        title: 'Reward Claimed!',
        description: `You earned ${REWARD_PER_GAME} OR for playing ${games[index].name}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Could not award points.',
      });
      console.error(error);
    } finally {
        setIsPlaying(prev => {
            const newIsPlaying = [...prev];
            newIsPlaying[index] = false;
            return newIsPlaying;
        });
    }
  };

  const handlePlayGame = (index: number) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    if (isPlaying[index]) {
      toast({ title: "Game in progress", description: "Please wait for the current session to end." });
      return;
    }
    
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

    intervalRefs.current[index] = setInterval(() => {
      setTimers(prev => {
        const newTimers = [...prev];
        if (newTimers[index] > 0) {
            newTimers[index] -= 1;
            return newTimers;
        } else {
            if (intervalRefs.current[index]) {
                clearInterval(intervalRefs.current[index]!);
                intervalRefs.current[index] = null;
            }
            handleAwardPoints(index);
            return newTimers;
        }
      });
    }, 1000);
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (selectedGame) {
    return (
        <div ref={gameContainerRef} className="fixed inset-0 z-50 bg-black">
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4 z-[60] rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
                onClick={() => setSelectedGame(null)}
            >
                <ArrowLeft className="h-6 w-6" />
                <span className="sr-only">Back to games</span>
            </Button>
            <iframe
                src={selectedGame.game.url}
                className="w-full h-full border-0"
                allow="fullscreen; autoplay"
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
                    <li>Choose any game from the Games section.</li>
                    <li>Play the game continuously for 5 minutes.</li>
                    <li>Do not close or refresh the game during play.</li>
                    <li>After 5 minutes, {REWARD_PER_GAME} are automatically added to your account.</li>
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
    <Card>
        <CardHeader>
            <CardTitle>Play Games & Earn</CardTitle>
            <CardDescription>
                <ul className="list-disc space-y-2 pl-5 mt-4 text-sm text-muted-foreground">
                    <li>Choose any game from the Games section.</li>
                    <li>Play the game continuously for 5 minutes.</li>
                    <li>Do not close or refresh the game during play.</li>
                    <li>After 5 minutes, {REWARD_PER_GAME} are automatically added to your account.</li>
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
                            {isPlaying[index] ? `Playing... (${formatTime(timers[index])})` : 'Play Game'}
                        </Button>
                    </Card>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
