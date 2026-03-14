'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Star, Timer, Trophy } from 'lucide-react';
import { AdDialog } from '@/components/earning/ad-dialog';

const GAMES = [
  { id: 'g_pool', name: 'Mini Pool 3D', reward: 30, time: '60s', difficulty: 'Medium', division: 'C' },
  { id: 'g1', name: 'Memory Match', reward: 10, time: '30s', difficulty: 'Easy', division: 'A' },
  { id: 'g2', name: 'Speed Clicker', reward: 15, time: '20s', difficulty: 'Medium', division: 'B' },
  { id: 'g3', name: 'Pattern Quest', reward: 25, time: '45s', difficulty: 'Hard', division: 'C' },
  { id: 'g4', name: 'Color Swap', reward: 12, time: '25s', difficulty: 'Easy', division: 'A' },
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
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Skill based tasks</p>
        </div>
        <Trophy className="h-8 w-8 text-yellow-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {GAMES.map((game) => (
          <Card key={game.id} className="overflow-hidden border-primary/10 relative group">
            {game.id === 'g_pool' && (
              <div className="absolute top-2 right-2 z-10">
                <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Hot</span>
              </div>
            )}
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
              <CardDescription className="text-[10px] font-bold uppercase">Earn {game.reward} OR Coins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {game.time}
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Trophy className="h-3 w-3" />
                  Div {game.division}
                </div>
              </div>
              <Button className="w-full" onClick={() => handlePlay(game)}>Play & Earn</Button>
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
        />
      )}
    </div>
  );
}