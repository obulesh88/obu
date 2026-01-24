'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { CheckCircle2, Gamepad2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const REWARD_PER_GAME = 10;
const NUM_GAMES = 8;
const GAMES_STORAGE_KEY = 'or_wallet_completed_games';
const GAMES_DAY_KEY = 'or_wallet_games_last_day';

const games = [
    { name: "Count Rush", url: "https://html5.gamemonetize.co/a2n82o95m2g0c8v0c6j10j5j1j3j0j/" },
    { name: "Line Color Puzzle", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #3", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #4", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #5", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #6", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #7", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
    { name: "Game #8", url: "https://html5.gamemonetize.co/lnp25m8d5j5e7f0n3p4g6g2f0g0g5g/" },
];

export default function GamesPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [submitting, setSubmitting] = useState<boolean[]>(Array(NUM_GAMES).fill(false));
  const [completed, setCompleted] = useState<boolean[]>(() => Array(NUM_GAMES).fill(false));
  const [allGamesCompleted, setAllGamesCompleted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const today = new Date().toDateString();
    const lastDay = localStorage.getItem(GAMES_DAY_KEY);
    let initialCompleted = Array(NUM_GAMES).fill(false);

    if (lastDay !== today) {
      localStorage.setItem(GAMES_DAY_KEY, today);
      localStorage.removeItem(GAMES_STORAGE_KEY);
    } else {
      const storedCompleted = localStorage.getItem(GAMES_STORAGE_KEY);
      if (storedCompleted) {
          try {
            const parsed = JSON.parse(storedCompleted);
            if(Array.isArray(parsed) && parsed.length === NUM_GAMES) {
                initialCompleted = parsed;
            }
          } catch(e) {
              console.error("Failed to parse completed games from storage", e);
          }
      }
    }
    setCompleted(initialCompleted);
    if(initialCompleted.every(c => c)) {
        setAllGamesCompleted(true);
    }
  }, []);

  useEffect(() => {
    if (completed.every(c => c)) {
        setAllGamesCompleted(true);
    }
  }, [completed]);

  const handlePlayGame = async (index: number) => {
      if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
      }
      
      setSubmitting(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });
      
      window.open(games[index].url, '_blank');

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
          title: 'Success!',
          description: `You earned ${REWARD_PER_GAME} OR coins.`,
        });

        setCompleted(prev => {
            const newState = [...prev];
            newState[index] = true;
            localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(newState));
            return newState;
        });

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: 'Could not award points.',
        });
      } finally {
        setSubmitting(prev => {
            const newState = [...prev];
            newState[index] = false;
            return newState;
        });
      }
  };
  
  const getButtonContent = (index: number) => {
      if(completed[index]) return 'Completed';
      if(submitting[index]) return 'Processing...';
      return 'Play & Earn';
  };

  const getButtonAction = (index: number) => {
      return () => handlePlayGame(index);
  };

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
            <CardTitle>Play Games & Earn</CardTitle>
            <CardDescription>Play a game to earn {REWARD_PER_GAME} OR coins.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: NUM_GAMES }).map((_, index) => (
                <Card key={index} className="p-4 flex flex-col items-center justify-center text-center">
                    <Skeleton className="h-10 w-10 mb-4" />
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-4 w-16 mb-4" />
                    <Skeleton className="h-10 w-28" />
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
            <CardDescription>Play a game to earn {REWARD_PER_GAME} OR coins.</CardDescription>
        </CardHeader>
        <CardContent>
            {allGamesCompleted ? (
                <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                    <h3 className="text-xl font-bold">All Games Played for Today!</h3>
                    <p className="text-muted-foreground">Come back tomorrow for more rewards.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {games.map((game, index) => (
                        <Card key={index} className={cn("flex flex-col items-center justify-center text-center p-4", completed[index] && "opacity-50")}>
                            <Gamepad2 className="h-10 w-10 text-primary mb-4" />
                            <p className="font-semibold mb-2">{game.name}</p>
                            <p className="text-sm text-muted-foreground mb-4">Earn {REWARD_PER_GAME} OR</p>
                            <Button 
                                onClick={getButtonAction(index)}
                                disabled={submitting[index] || completed[index]}
                                className="w-full"
                            >
                                {getButtonContent(index)}
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </CardContent>
    </Card>
  );
}
