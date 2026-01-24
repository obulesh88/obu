'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const REWARD_PER_GAME = 10;
const NUM_GAMES = 8;
const PLAY_DELAY = 60; // 60 seconds
const GAMES_STORAGE_KEY = 'or_wallet_completed_games';
const GAMES_DAY_KEY = 'or_wallet_games_last_day';

const GAME_URL = "https://html5.gamemonetize.com/5u84alj5z5n3h0qtu9w6yty328jbtj3f/";

export default function GamesListPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [submitting, setSubmitting] = useState<boolean[]>(Array(NUM_GAMES).fill(false));
  const [completed, setCompleted] = useState<boolean[]>(() => Array(NUM_GAMES).fill(false));
  const [countdown, setCountdown] = useState<number[]>(Array(NUM_GAMES).fill(0));
  const [readyToClaim, setReadyToClaim] = useState<boolean[]>(Array(NUM_GAMES).fill(false));
  const [allGamesCompleted, setAllGamesCompleted] = useState(false);

  useEffect(() => {
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
  
  const handleStart = (index: number) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    setSubmitting(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
    setCountdown(prev => {
      const newState = [...prev];
      newState[index] = PLAY_DELAY;
      return newState;
    });
    
    window.open(GAME_URL, '_blank');

    let currentCountdown = PLAY_DELAY;
    const timer = setInterval(() => {
        currentCountdown -= 1;
        setCountdown(prev => {
            const newState = [...prev];
            newState[index] = currentCountdown;
            return newState;
        });

        if (currentCountdown <= 0) {
            clearInterval(timer);
            setReadyToClaim(prev => {
                const newState = [...prev];
                newState[index] = true;
                return newState;
            });
            setSubmitting(prev => {
                const newState = [...prev];
                newState[index] = false;
                return newState;
            });
        }
    }, 1000);
  };

  const handleClaim = async (index: number) => {
      if (!user || !firestore) return;

      setSubmitting(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });

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
        setReadyToClaim(prev => {
            const newState = [...prev];
            newState[index] = false;
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
      if(readyToClaim[index]) return `Claim ${REWARD_PER_GAME} OR`;
      if(submitting[index]) return `Playing... ${countdown[index]}s`;
      return 'Play Game';
  };

  const getButtonAction = (index: number) => {
      if(readyToClaim[index]) return () => handleClaim(index);
      return () => handleStart(index);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Play Games & Earn</CardTitle>
        <CardDescription>Play a game for {PLAY_DELAY} seconds to earn {REWARD_PER_GAME} OR coins. You can play up to {NUM_GAMES} {NUM_GAMES === 1 ? 'game' : 'games'} per day.</CardDescription>
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
              {Array.from({ length: NUM_GAMES }).map((_, index) => (
                <Card key={index} className={cn(completed[index] && "opacity-50")}>
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Gamepad2 className="h-10 w-10 text-primary mb-4" />
                    <p className="font-semibold mb-2">Game #{index + 1}</p>
                    <p className="text-sm text-muted-foreground mb-4">Earn {REWARD_PER_GAME} OR</p>
                    <Button 
                        onClick={getButtonAction(index)}
                        disabled={submitting[index] || completed[index]}
                    >
                      {getButtonContent(index)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
