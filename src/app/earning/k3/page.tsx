'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Timer, 
  Info, 
  ChevronLeft, 
  Zap,
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TIME_OPTIONS = [
  { id: '1m', label: 'K3 1 Min', icon: <Zap className="h-4 w-4" /> },
  { id: '3m', label: 'K3 3 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '5m', label: 'K3 5 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '10m', label: 'K3 10 Min', icon: <Timer className="h-4 w-4" /> },
];

type K3Result = {
  period: string;
  dice: number[];
  sum: number;
  bs: 'Big' | 'Small';
  oe: 'Odd' | 'Even';
};

const DiceIcon = ({ num, className }: { num: number, className?: string }) => {
  switch (num) {
    case 1: return <Dice1 className={className} />;
    case 2: return <Dice2 className={className} />;
    case 3: return <Dice3 className={className} />;
    case 4: return <Dice4 className={className} />;
    case 5: return <Dice5 className={className} />;
    case 6: return <Dice6 className={className} />;
    default: return null;
  }
};

export default function K3Page() {
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(59);
  const [history, setHistory] = useState<K3Result[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState('');

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}3000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const generateResult = useCallback(() => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2 + d3;

    const newResult: K3Result = {
      period: generatePeriodId(),
      dice: [d1, d2, d3],
      sum: sum,
      bs: sum >= 11 ? 'Big' : 'Small',
      oe: sum % 2 === 0 ? 'Even' : 'Odd'
    };

    setHistory(prev => [newResult, ...prev].slice(0, 10));
    setCurrentPeriod(generatePeriodId());
  }, [generatePeriodId]);

  useEffect(() => {
    setCurrentPeriod(generatePeriodId());
    const initialHistory: K3Result[] = Array.from({ length: 5 }).map((_, i) => {
      const d = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      const s = d[0] + d[1] + d[2];
      return {
        period: (parseInt(generatePeriodId()) - (i + 1)).toString(),
        dice: d,
        sum: s,
        bs: s >= 11 ? 'Big' : 'Small',
        oe: s % 2 === 0 ? 'Even' : 'Odd'
      };
    });
    setHistory(initialHistory);
  }, [generatePeriodId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 0) return prev - 1;
        generateResult();
        return 59;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [generateResult]);

  return (
    <div className="flex flex-col gap-4 pb-24 bg-zinc-950 min-h-screen -m-4 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between text-white mb-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-black uppercase tracking-widest italic">K3 Lotre</h1>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {/* Time Tabs */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {TIME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedTime(opt.id)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl transition-all border border-white/5",
              selectedTime === opt.id 
                ? "bg-gradient-to-b from-purple-500 to-indigo-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]" 
                : "bg-zinc-900 text-zinc-500"
            )}
          >
            <div className="mb-1">{opt.icon}</div>
            <span className="text-[9px] font-black uppercase text-center leading-tight">
              {opt.label.split(' ')[1]}<br/>{opt.label.split(' ').slice(2).join(' ')}
            </span>
          </button>
        ))}
      </div>

      {/* Main Game Card */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-500 border-none relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <CardContent className="p-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col gap-2">
            <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase inline-block">
              {selectedTime} Game
            </div>
            <div className="flex gap-2 mt-2">
              {history[0]?.dice.map((d, i) => (
                <div key={i} className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-lg transform rotate-3">
                  <DiceIcon num={d} className="h-7 w-7 text-indigo-600" />
                </div>
              ))}
            </div>
            <p className="text-[9px] font-mono text-white/70 mt-2 font-black">Period: {currentPeriod}</p>
          </div>
          <div className="text-right flex flex-col items-end">
             <p className="text-xs font-black text-white uppercase tracking-wider mb-1">Ends In</p>
             <div className="flex gap-1">
               {timeLeft.toString().padStart(2, '0').split('').map((char, i) => (
                 <span key={i} className="bg-zinc-900 text-white font-mono text-2xl font-black p-2 rounded min-w-[30px] text-center shadow-inner border border-white/10">
                   {char}
                 </span>
               ))}
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Betting Options */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-white/5 p-4 flex flex-col gap-2 items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
             <Zap className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-xs font-black uppercase text-white">Total Sum</p>
          <p className="text-[9px] text-zinc-500 font-bold uppercase">Predict 3-18</p>
        </Card>
        <Card className="bg-zinc-900 border-white/5 p-4 flex flex-col gap-2 items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
             <Trophy className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-xs font-black uppercase text-white">Specific Triple</p>
          <p className="text-[9px] text-zinc-500 font-bold uppercase">Big Payouts</p>
        </Card>
      </div>

      {/* Big/Small & Odd/Even Grid */}
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(49,46,129)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Big</Button>
          <Button className="h-14 bg-zinc-700 hover:bg-zinc-600 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(39,39,42)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Small</Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-14 bg-purple-600 hover:bg-purple-700 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(88,28,135)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Odd</Button>
          <Button className="h-14 bg-zinc-700 hover:bg-zinc-600 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(39,39,42)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Even</Button>
        </div>
      </div>

      {/* Quick History List */}
      <div className="bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5">
        <div className="p-4 bg-indigo-600/10 border-b border-white/5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Recent Results</h3>
        </div>
        <div className="divide-y divide-white/5">
          {history.map((row, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-zinc-500">#{row.period.slice(-4)}</span>
                <span className={cn("text-lg font-black", row.bs === 'Big' ? 'text-indigo-400' : 'text-zinc-400')}>
                  {row.sum}
                </span>
              </div>
              <div className="flex gap-1.5">
                {row.dice.map((d, di) => (
                  <DiceIcon key={di} num={d} className="h-5 w-5 text-zinc-300" />
                ))}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-white leading-none">{row.bs}</p>
                <p className="text-[9px] font-bold uppercase text-zinc-500 mt-1">{row.oe}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
