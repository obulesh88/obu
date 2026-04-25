
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Construction, Dices, Trophy, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function WingoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Wingo Luck</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Prediction Rewards</p>
        </div>
        <Trophy className="h-8 w-8 text-orange-500" />
      </div>

      <Card className="border-primary/10 overflow-hidden min-h-[450px] flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm relative">
        <div className="absolute top-4 right-4 animate-pulse">
           <Sparkles className="h-6 w-6 text-orange-500/40" />
        </div>
        <CardContent className="p-12 text-center space-y-6 flex flex-col items-center">
          <div className="relative">
             <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
             <div className="relative rounded-full bg-orange-500/10 p-10 border-2 border-orange-500/20 shadow-2xl">
               <Dices className="h-20 w-20 text-orange-500" />
             </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-4xl font-black uppercase tracking-tighter text-white">Shortly Live</h3>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed opacity-80">
              The high-speed color prediction module is in final testing. Get ready for instant payouts.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <Separator className="w-1/2 opacity-10" />
            <div className="flex items-center gap-2 text-orange-500/80">
              <Construction className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Integrating Payment Nodes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
