
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Timer, 
  ChevronLeft, 
  Zap,
  Gamepad2,
  Trophy,
  History,
  Users,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';

const TIME_OPTIONS = [
  { id: '1m', label: 'DT 1 Min', icon: <Zap className="h-4 w-4" /> },
  { id: '3m', label: 'DT 3 Min', icon: <Timer className="h-4 w-4" /> },
];

const CHIPS = [1, 5, 10, 50, 100, 500];

type DTResult = {
  id?: string;
  period: string;
  dragonCard: number;
  tigerCard: number;
  winner: 'Dragon' | 'Tiger' | 'Tie';
  createdAt: any;
};

const CardIcon = ({ val, winner, label }: { val: number, winner: boolean, label: string }) => {
  const getLabel = (v: number) => {
    if (v === 1) return 'A';
    if (v === 11) return 'J';
    if (v === 12) return 'Q';
    if (v === 13) return 'K';
    return v.toString();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest",
        label === 'Dragon' ? "text-rose-500" : "text-blue-500"
      )}>{label}</span>
      <div className={cn(
        "h-24 w-16 md:h-32 md:w-24 bg-white rounded-lg flex flex-col items-center justify-center relative shadow-2xl transition-all duration-700 animate-in zoom-in-75",
        winner ? "ring-4 ring-yellow-400 scale-110" : "opacity-90"
      )}>
         <span className="absolute top-1 left-1 text-[10px] font-bold text-slate-900">{getLabel(val)}</span>
         <span className="text-2xl md:text-5xl font-black text-slate-900">{getLabel(val)}</span>
         <span className="absolute bottom-1 right-1 text-[10px] font-bold text-slate-900 rotate-180">{getLabel(val)}</span>
      </div>
    </div>
  );
};

export default function DragonTigerPage() {
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(10);
  const firestore = useFirestore();

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'dragon_tiger_results'),
      orderBy('period', 'desc'),
      limit(24) // More results for the roadmap
    );
  }, [firestore]);

  const { data: history } = useCollection<DTResult>(resultsQuery);

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}4000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const currentPeriod = useMemo(() => generatePeriodId(), [generatePeriodId, timeLeft]);

  const generateAndSaveResult = useCallback(async () => {
    if (!firestore) return;

    const periodId = generatePeriodId();
    if (history?.some(h => h.period === periodId)) return;

    const r = Math.random() * 100;
    let dVal, tVal, winner: 'Dragon' | 'Tiger' | 'Tie';

    if (r < 4) {
      dVal = tVal = Math.floor(Math.random() * 13) + 1;
      winner = 'Tie';
    } else if (r < 52) {
      dVal = Math.floor(Math.random() * 12) + 2;
      tVal = Math.floor(Math.random() * (dVal - 1)) + 1;
      winner = 'Dragon';
    } else {
      tVal = Math.floor(Math.random() * 12) + 2;
      dVal = Math.floor(Math.random() * (tVal - 1)) + 1;
      winner = 'Tiger';
    }

    const resultDocRef = doc(firestore, 'dragon_tiger_results', periodId);
    setDoc(resultDocRef, {
      period: periodId,
      dragonCard: dVal,
      tigerCard: tVal,
      winner: winner,
      createdAt: serverTimestamp()
    });
  }, [firestore, generatePeriodId, history]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const seconds = 60 - now.getSeconds();
      setTimeLeft(seconds);

      if (seconds === 60 || seconds === 1) {
        generateAndSaveResult();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [generateAndSaveResult]);

  return (
    <div className="flex flex-col gap-0 pb-24 bg-[#050308] min-h-screen -m-4 overflow-x-hidden relative">
      {/* Top Bar / Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic">Dragon vs Tiger</span>
          <span className="text-xs font-bold text-zinc-500 font-mono">{currentPeriod}</span>
        </div>
        <div className="bg-slate-900 rounded-lg px-2 py-1 border border-white/10 flex items-center gap-2">
          <Timer className="h-3 w-3 text-yellow-500" />
          <span className="text-xs font-black text-yellow-500 font-mono">00:{timeLeft.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Road Map Grid */}
      <div className="bg-[#1a1525] p-2 overflow-x-auto scrollbar-hide">
        <div className="grid grid-cols-12 gap-1 min-w-[400px]">
          {history?.slice(0, 24).reverse().map((res, i) => (
            <div key={i} className="flex items-center justify-center p-1">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white/10 shadow-lg",
                res.winner === 'Dragon' ? "bg-rose-600 text-white" : 
                res.winner === 'Tiger' ? "bg-blue-600 text-white" : "bg-emerald-500 text-white"
              )}>
                {res.winner.charAt(0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Arena Display */}
      <div className="relative h-[300px] w-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 via-[#0a0515] to-[#0a0515] overflow-hidden">
        {/* Dealer Avatar Placeholder */}
        <div className="absolute top-0 flex flex-col items-center">
          <div className="relative h-40 w-40 mt-2 opacity-80">
             <Image 
                src="https://images.unsplash.com/photo-1595514191830-3e96a518989b?q=80&w=600&h=600&fit=crop" 
                alt="Dealer" 
                fill 
                className="object-cover rounded-full mask-gradient-to-b"
                data-ai-hint="dealer portrait"
             />
          </div>
        </div>

        {/* Cards Reveal Area */}
        <div className="relative z-10 w-full flex justify-around items-center px-4 mt-16">
          <CardIcon 
            label="Dragon" 
            val={history?.[0]?.dragonCard || 1} 
            winner={history?.[0]?.winner === 'Dragon'} 
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 bg-yellow-500 rounded-full flex items-center justify-center font-black text-slate-950 shadow-[0_0_20px_rgba(234,179,8,0.5)] z-20">VS</div>
            {history?.[0]?.winner === 'Tie' && (
              <span className="text-emerald-400 font-black uppercase text-[10px] animate-pulse bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">Tie Result</span>
            )}
          </div>

          <CardIcon 
            label="Tiger" 
            val={history?.[0]?.tigerCard || 1} 
            winner={history?.[0]?.winner === 'Tiger'} 
          />
        </div>

        {/* Dynamic Table Stats */}
        <div className="absolute bottom-4 w-full flex justify-between px-6">
           <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
              <Users className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] font-black text-zinc-300">1,245 Players</span>
           </div>
           <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
              <Trophy className="h-3 w-3 text-yellow-500" />
              <span className="text-[10px] font-black text-yellow-500">₹45.2k Total Bet</span>
           </div>
        </div>
      </div>

      {/* Betting Zone */}
      <div className="p-4 grid gap-4 bg-[#0a0515]">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-2">
            <Button className="h-28 bg-rose-600/20 hover:bg-rose-600/30 border-2 border-rose-500/40 text-rose-500 flex flex-col items-center justify-center gap-2 rounded-2xl active:scale-95 transition-all group overflow-hidden relative">
              <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-active:opacity-100 transition-opacity"></div>
              <span className="text-xl font-black italic tracking-tighter uppercase">Dragon</span>
              <span className="text-[10px] font-bold opacity-60">1 : 1</span>
            </Button>
            <div className="text-[9px] font-black text-center text-rose-500/60 uppercase">₹12,450</div>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="h-28 bg-emerald-600/20 hover:bg-emerald-600/30 border-2 border-emerald-500/40 text-emerald-500 flex flex-col items-center justify-center gap-2 rounded-2xl active:scale-95 transition-all group relative">
              <span className="text-xl font-black italic tracking-tighter uppercase">Tie</span>
              <span className="text-[10px] font-bold opacity-60">1 : 8</span>
            </Button>
            <div className="text-[9px] font-black text-center text-emerald-500/60 uppercase">₹2,100</div>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="h-28 bg-blue-600/20 hover:bg-blue-600/30 border-2 border-blue-500/40 text-blue-500 flex flex-col items-center justify-center gap-2 rounded-2xl active:scale-95 transition-all group relative">
              <span className="text-xl font-black italic tracking-tighter uppercase">Tiger</span>
              <span className="text-[10px] font-bold opacity-60">1 : 1</span>
            </Button>
            <div className="text-[9px] font-black text-center text-blue-500/60 uppercase">₹14,200</div>
          </div>
        </div>

        {/* Chip Selection Bar */}
        <div className="flex items-center justify-around bg-slate-900/50 p-3 rounded-2xl border border-white/5 shadow-2xl">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setSelectedChip(chip)}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all transform active:scale-90",
                selectedChip === chip 
                  ? "bg-yellow-500 text-slate-950 scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)] border-2 border-white ring-2 ring-yellow-500/20" 
                  : "bg-slate-800 text-zinc-400 border border-white/10"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* History Table Bottom */}
      <div className="px-4 pb-24">
        <div className="bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-zinc-500" />
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Battle Records</span>
            </div>
          </div>
          <table className="w-full text-center">
            <thead className="bg-slate-900/80 text-zinc-500 uppercase text-[9px] font-black">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Winner</th>
                <th className="py-3 px-4">Detail</th>
              </tr>
            </thead>
            <tbody className="text-white text-xs font-bold divide-y divide-white/5">
              {history?.slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono text-[9px] text-zinc-600">{row.period}</td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                      row.winner === 'Dragon' ? 'bg-rose-500/20 text-rose-500' : 
                      row.winner === 'Tiger' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'
                    )}>
                      {row.winner.charAt(0)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2 text-[10px] font-black">
                       <span className="text-rose-400">{row.dragonCard}</span>
                       <span className="text-zinc-600">vs</span>
                       <span className="text-blue-400">{row.tigerCard}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
