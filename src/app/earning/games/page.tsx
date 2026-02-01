'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { GameCaptchaDialog } from '@/components/earning/game-captcha-dialog';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const NUM_GAMES = 8;
const REWARD_PER_SESSION = 3;

const games = [
    { name: "Count Rush", url: "https://html5.gamemonetize.co/hbvt6ecfxfrtu62sm0km7c1gs23be5c2/" },
    { name: "Line Color Puzzle", url: "https://html5.gamemonetize.co/m4o7lueza84sd0qy0wrn991ups3x1l64/" },
    { name: "Bubble Shooter Relaxing Puzzle", url: "https://html5.gamemonetize.co/tv66qo5zdz26osoqx597umvqyuaov0cs/" },
    { name: "My Cat Restaurant", url: "https://html5.gamemonetize.co/zro5d0oom4aubos4mlka610s5mla0zt3/" },
    { name: "Memory Emoji", url: "https://html5.gamemonetize.co/3s56bhfz1vc2njsrlqzgnfs9m2r9eabf/" },
    { name: "Gear Shift Race", url: "https://html5.gamemonetize.co/bwxvpns0l9v0vxqcsj2v5uw6ummx54zr/" },
    { name: "Colour Wood", url: "https://html5.gamemonetize.co/aiq299yp6g7oyyqmlmsuemyl8ud8jds9/" },
    { name: "Poker", url: "https://html5.gamemonetize.co/f5mv3cltk9bjta0h3t54c1isiqwlxgf3/" },
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


  const handlePlayGame = async (index: number) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    if (isPlaying.some(playing => playing)) {
      toast({ title: "Game in progress", description: "Please finish your current game session first." });
      return;
    }
    
    // Set state locally first for responsiveness
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
    setSelectedGame({ game: games[index], index });

    // Update firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userDocRef, {
            'playGames.is_active': true,
            'playGames.play_start': serverTimestamp(),
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
        // Revert state if firestore update fails
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
    }
  };

  const handleEndGameAndClaim = () => {
      if (!selectedGame) return;
      const { index } = selectedGame;
      
      setSessionEarnings(prev => {
          const newEarnings = [...prev];
          newEarnings[index] = REWARD_PER_SESSION;
          return newEarnings;
      });

      setSelectedGame(null);
      setVerifyingGameIndex(index);
      setIsCaptchaOpen(true);
  };


  const handleClaimReward = async () => {
    if (!user || verifyingGameIndex === null || !firestore) return;
    
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
        
        await updateDoc(userDocRef, {
            'wallet.orBalance': increment(REWARD_PER_SESSION),
            'playGames.total_play_seconds': increment(playDuration),
            'playGames.is_active': false,
            'playGames.play_start': null,
            'playGames.verifiedAt': serverTimestamp(),
            'playGames.claimed': true,
            'playGames.reward_comm': REWARD_PER_SESSION,
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
    return (
        <div ref={gameContainerRef} className="relative w-full flex-1 bg-black">
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4 z-[60] rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"
                onClick={handleEndGameAndClaim}
            >
                <ArrowLeft className="h-6 w-6" />
                <span className="sr-only">Back to games</span>
            </Button>
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
                    <li>When you are finished, click the back button in the game to solve a captcha and claim your 3 OR reward.</li>
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
                    <li>Choose any game to start playing.</li>
                    <li>When you are finished, click the back button in the game to solve a captcha and claim your 3 OR reward.</li>
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
