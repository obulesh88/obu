'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { Gamepad2, ArrowLeft, RefreshCw, Timer, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { GameCaptchaDialog } from '@/components/earning/game-captcha-dialog';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

const NUM_GAMES = 8;
const REWARD_PER_SESSION = 3;
const LOADING_TIMER_DURATION = 20;
const MAX_SESSION_SECONDS = 1800; // 30 minutes
const MIN_PLAY_TIME_SECONDS = 300; // 5 minutes

const games = [
    { id: "count_rush", name: "Count Rush", url: "https://html5.gamemonetize.co/hbvt6ecfxfrtu62sm0km7c1gs23be5c2/" },
    { id: "line_color_puzzle", name: "Line Color Puzzle", url: "https://html5.gamemonetize.co/m4o7lueza84sd0qy0wrn991ups3x1l64/" },
    { id: "bubble_shooter", name: "Bubble Shooter Relaxing Puzzle", url: "https://html5.gamemonetize.co/tv66qo5zdz26osoqx597umvqyuaov0cs/" },
    { id: "my_cat_restaurant", name: "My Cat Restaurant", url: "https://html5.gamemonetize.co/zro5d0oom4aubos4mlka610s5mla0zt3/" },
    { id: "memory_emoji", name: "Memory Emoji", url: "https://html5.gamemonetize.co/3s56bhfz1vc2njsrlqzgnfs9m2r9eabf/" },
    { id: "gear_shift_race", name: "Gear Shift Race", url: "https://html5.gamemonetize.co/bwxvpns0l9v0vxqcsj2v5uw6ummx54zr/" },
    { id: "colour_wood", name: "Colour Wood", url: "https://html5.gamemonetize.co/aiq299yp6g7oyyqmlmsuemyl8ud8jds9/" },
    { id: "poker", name: "Poker", url: "https://html5.gamemonetize.co/f5mv3cltk9bjta0h3t54c1isiqwlxgf3/" },
];

export default function GamesPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { setBottomNavVisible, setPaddingDisabled } = useLayout();

  const [isClient, setIsClient] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ game: any; index: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean[]>(Array(NUM_GAMES).fill(false));
  const [sessionEarnings, setSessionEarnings] = useState<number[]>(Array(NUM_GAMES).fill(0));
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [verifyingGameIndex, setVerifyingGameIndex] = useState<number | null>(null);
  const [gameLoadingCountdown, setGameLoadingCountdown] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  const [gameStartTimes, setGameStartTimes] = useState<(number | null)[]>(Array(NUM_GAMES).fill(null));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (selectedGame) {
      setBottomNavVisible(false);
      setPaddingDisabled(true);
    } else {
      setBottomNavVisible(true);
      setPaddingDisabled(false);
    }

    return () => {
      setBottomNavVisible(true);
      setPaddingDisabled(false);
    };
  }, [selectedGame, setBottomNavVisible, setPaddingDisabled]);

  // Loading Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameLoadingCountdown > 0) {
      timer = setInterval(() => {
        setGameLoadingCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameLoadingCountdown]);

  // Session Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedGame && gameLoadingCountdown === 0) {
      timer = setInterval(() => {
        setSessionTime((prev) => {
          if (prev >= MAX_SESSION_SECONDS) {
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(timer);
  }, [selectedGame, gameLoadingCountdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayGame = async (index: number) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    if (isPlaying.some(playing => playing)) {
      toast({ title: "Game in progress", description: "Please finish your current game session first." });
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
    setGameStartTimes(prev => {
        const newTimers = [...prev];
        newTimers[index] = Date.now();
        return newTimers;
    });
    
    setGameLoadingCountdown(LOADING_TIMER_DURATION);
    setSelectedGame({ game: games[index], index });

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userDocRef, {
            'playGames.is_active': true,
            'playGames.play_start': serverTimestamp(),
            'playGames.game_id': games[index].id,
            'updatedAt': serverTimestamp(),
        });
    } catch (error: any) {
         if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { 
                    'playGames.is_active': true,
                    'playGames.play_start': '(now)',
                    'playGames.game_id': games[index].id,
                    'updatedAt': '(now)',
                }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             toast({
                variant: 'destructive',
                title: 'Failed to start game',
                description: error.message || 'Could not update game status.',
            });
        }
        setIsPlaying(prev => {
            const newIsPlaying = [...prev];
            newIsPlaying[index] = false;
            return newIsPlaying;
        });
        setGameStartTimes(prev => {
            const newTimers = [...prev];
            newTimers[index] = null;
            return newTimers;
        });
        setSelectedGame(null);
        setGameLoadingCountdown(0);
    }
  };

  const handleEndGameAndClaim = () => {
      if (!selectedGame) return;
      const { index } = selectedGame;
      
      if (sessionTime < MIN_PLAY_TIME_SECONDS) {
          toast({ 
              variant: 'destructive', 
              title: "Time requirement not met", 
              description: `You must play for at least 5 minutes to earn rewards. Current: ${formatTime(sessionTime)}`
          });
          return;
      }

      setSessionEarnings(prev => {
          const newEarnings = [...prev];
          newEarnings[index] = REWARD_PER_SESSION;
          return newEarnings;
      });

      setSelectedGame(null);
      setVerifyingGameIndex(index);
      setIsCaptchaOpen(true);
  };

  const handleExitEarly = async () => {
    if (!selectedGame || !user || !firestore) return;
    const { index } = selectedGame;

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userDocRef, {
            'playGames.is_active': false,
            'playGames.play_start': null,
            'playGames.game_id': null,
            'updatedAt': serverTimestamp(),
        });
    } catch (e) {
        // Silent error
    }

    setIsPlaying(prev => {
        const newIsPlaying = [...prev];
        newIsPlaying[index] = false;
        return newIsPlaying;
    });
    setGameStartTimes(prev => {
        const newTimers = [...prev];
        newTimers[index] = null;
        return newTimers;
    });
    setSelectedGame(null);
    toast({
        title: "Session Cancelled",
        description: "Game session ended without reward."
    });
  };

  const handleClaimReward = async () => {
    if (!user || verifyingGameIndex === null || !firestore) {
      return;
    }
    
    const potentialReward = sessionEarnings[verifyingGameIndex];
    if (potentialReward <= 0) {
        toast({ variant: 'destructive', title: "No reward to claim." });
        setIsCaptchaOpen(false);
        setVerifyingGameIndex(null);
        return;
    }
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
        const startTime = gameStartTimes[verifyingGameIndex!];
        const playDuration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
        const minutesPlayed = Math.round(playDuration / 60);

        const token = await user.getIdToken();

        const res = await fetch(
            "https://us-central1-earning-app-ff02b.cloudfunctions.net/claimGameCoins",
            {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ minutesPlayed })
            }
        );

        if (!res.ok) {
            const err = await res.text();
            throw new Error("API error: " + err);
        }

        const data = await res.json();
        console.log(data);

        await updateDoc(userDocRef, {
            'wallet.orBalance': increment(REWARD_PER_SESSION),
            'playGames.total_play_seconds': increment(playDuration),
            'playGames.is_active': false,
            'playGames.play_start': null,
            'playGames.verifiedAt': serverTimestamp(),
            'playGames.claimed': true,
            'playGames.reward_comm': REWARD_PER_SESSION,
            'playGames.game_id': null,
            'updatedAt': serverTimestamp(),
        });
        
      toast({
        title: 'Reward Claimed!',
        description: `You've earned ${REWARD_PER_SESSION} OR for playing ${games[verifyingGameIndex].name}.`,
      });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { 
                    'wallet.orBalance': `increment(${REWARD_PER_SESSION})`,
                    'playGames.total_play_seconds': `increment(...)`,
                    'playGames.is_active': false,
                    'playGames.play_start': null,
                    'playGames.verifiedAt': '(now)',
                    'playGames.claimed': true,
                    'playGames.reward_comm': REWARD_PER_SESSION,
                    'playGames.game_id': null,
                    'updatedAt': '(now)',
                }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
             toast({
                variant: 'destructive',
                title: 'Claim Failed',
                description: error.message || 'Could not claim reward. Please try again.',
            });
        }
    } finally {
        setIsCaptchaOpen(false);
        if (verifyingGameIndex !== null) {
            setSessionEarnings(prev => {
                const newEarnings = [...prev];
                newEarnings[verifyingGameIndex] = 0;
                return newEarnings;
            });
            setIsPlaying(prev => {
                const newIsPlaying = [...prev];
                newIsPlaying[verifyingGameIndex] = false;
                return newIsPlaying;
            });
            setGameStartTimes(prev => {
                const newTimers = [...prev];
                newTimers[verifyingGameIndex] = null;
                return newTimers;
            });
        }
        setVerifyingGameIndex(null);
    }
  };

  if (selectedGame) {
    const canClaim = sessionTime >= MIN_PLAY_TIME_SECONDS;

    return (
        <div ref={gameContainerRef} className="relative w-full flex-1 bg-black">
            {gameLoadingCountdown > 0 && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                        <h2 className="text-2xl font-bold">Preparing Game...</h2>
                        <p className="text-muted-foreground">The game will be ready in {gameLoadingCountdown} seconds.</p>
                    </div>
                </div>
            )}
            
            {gameLoadingCountdown === 0 && (
                <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-2 py-1 px-3 bg-black/50 text-white backdrop-blur-sm border-none">
                        <Timer className="h-4 w-4" />
                        <span className="font-mono text-sm">{formatTime(sessionTime)}</span>
                    </Badge>
                </div>
            )}

            <div className="absolute top-4 left-4 z-[60] flex gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
                    onClick={handleExitEarly}
                    title="Exit without reward"
                >
                    <X className="h-6 w-6" />
                    <span className="sr-only">Exit game</span>
                </Button>

                {canClaim && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full bg-primary text-white hover:bg-primary/90"
                        onClick={handleEndGameAndClaim}
                        title="Back to claim reward"
                    >
                        <ArrowLeft className="h-6 w-6" />
                        <span className="sr-only">Back to claim</span>
                    </Button>
                )}
            </div>

            <iframe
                src={selectedGame.game.url}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
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
                    <li>Choose any game to start playing.</li>
                    <li>Play for at least 5 minutes to unlock the claim button.</li>
                    <li>When you are finished, click the claim button to solve a captcha and get your 3 OR reward.</li>
                    <li>Exiting before 5 minutes will result in no reward.</li>
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
                    <li>Choose any game to start playing.</li>
                    <li>Play for at least 5 minutes to unlock the claim button.</li>
                    <li>When you are finished, click the claim button to solve a captcha and get your 3 OR reward.</li>
                    <li>Exiting before 5 minutes will result in no reward.</li>
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
                            disabled={isPlaying.some(p=>p) && !isPlaying[index]}
                        >
                            {isPlaying[index] ? 'Playing...' : 'Play Game'}
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
