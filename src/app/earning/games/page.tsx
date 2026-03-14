'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Star, Timer, Trophy } from 'lucide-react';
import { AdDialog } from '@/components/earning/ad-dialog';

const GAMES = [
  { 
    id: 'g_neon', 
    name: 'Neon Velocity', 
    reward: 20, 
    time: 300, // 5 minutes
    difficulty: 'Extreme', 
    division: 'A',
    gameUrl: 'https://html5.gamemonetize.co/8v5u7p3w4e2n1z9m0b8v7c6x5z4q3w2e/' // Placeholder URL
  },
  { 
    id: 'g_pool', 
    name: 'Mini Pool 3D', 
    reward: 20, 
    time: 300, // 5 minutes
    difficulty: 'Medium', 
    division: 'C',
    gameUrl: 'https://html5.gamemonetize.co/ehi2vjrem0ya35imcjiofupvjerb5mhr/'
  },
  { 
    id: 'g_escape', 
    name: 'The Escape Block', 
    reward: 20, 
    time: 300, // 5 minutes
    difficulty: 'Hard', 
    division: 'B',
    gameUrl: 'https://html5.gamemonetize.co/qtba3xs4tqydx8kgmnbgl7pdzgkal9t3/'
  }
];

export default function GamesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<typeof GAMES[0] | null>(null);

  const handlePlay = (game: typeof GAMES[0]) => {
    setSelectedGame(game);
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase">Game Station</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Interactive tasks</p>
        </div>
        <Trophy className="h-8 w-8 text-yellow-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {GAMES.map((game) => (
          <Card key={game.id} className="overflow-hidden border-primary/10 relative group bg-card hover:shadow-lg transition-shadow">
            <div className="absolute top-2 right-2 z-10">
              <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Hot</span>
            </div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
                  <Star className="h-3 w-3 fill-current" />
                  {game.difficulty}
                </div>
              </div>
              <CardTitle className="mt-2 text-lg">{game.name}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">Reward: {game.reward} OR Coins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {Math.floor(game.time / 60)}m {game.time % 60}s
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Trophy className="h-3 w-3" />
                  Div {game.division}
                </div>
              </div>
              <Button className="w-full font-bold" onClick={() => handlePlay(game)}>Start Task</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedGame && (
        <AdDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onComplete={() => {}}
          gameId={selectedGame.id}
          division={selectedGame.division as 'A' | 'B' | 'C'}
          rewardAmount={selectedGame.reward}
          gameUrl={selectedGame.gameUrl}
          playTimeSeconds={selectedGame.time}
        />
      )}
    </div>
  );
}
