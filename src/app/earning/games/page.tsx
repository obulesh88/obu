'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const NUM_GAMES = 8;

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

  const [isClient, setIsClient] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{ game: any; index: number } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePlayGame = (index: number) => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated' });
        return;
      }
      
      if (games[index].name === 'My Cat Restaurant') {
        setSelectedGame({ game: games[index], index });
        return;
      }
      
      window.open(games[index].url, '_blank');

      toast({
        title: 'Game launched!',
        description: 'The game has been opened in a new tab.',
      });
  };
  
  if (selectedGame) {
    return (
        <div className="fixed inset-0 z-50 bg-black">
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
            <CardTitle>Play Games</CardTitle>
            <CardDescription>Play games anytime you want.</CardDescription>
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
            <CardTitle>Play Games</CardTitle>
            <CardDescription>Play games anytime you want.</CardDescription>
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
                        >
                            Play Game
                        </Button>
                    </Card>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
