
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
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const TIME_OPTIONS = [
  { id: '1m', label: 'DT 1 Min', icon: <Zap className="h-4 w-4" /> },
  { id: '3m', label: 'DT 3 Min', icon: <Timer className="h-4 w-4" /> },
];

type DTResult = {
  id?: string;
  period: string;
  dragonCard: number;
  tigerCard: number;
  winner: 'Dragon' | 'Tiger' | 'Tie';
  createdAt: any;
};

const CardIcon = ({ val, winner }: { val: number, winner: boolean }) => {
  const getSuit = () => {
    const suits = ['♠', '♣', '♥', '♦'];
    return suits[Math.floor(Math.random() * 4)];
  };
  
  const getLabel = (v: number) => {
    if (v === 1) return 'A';
    if (v === 11) return 'J';
    if (v === 12) return 'Q';
    if (v === 13) return 'K';
    return v.toString();
  };

  return (
    <div className={cn(
      "h-24 w-16 md:h-32 md:w-24 bg-white rounded-lg flex flex-col items-center justify-center relative shadow-2xl transition-all duration-700",
      winner ? "ring-4 ring-yellow-400 scale-110" : "opacity-80"
    )}>
       <span className="absolute top-1 left-1 text-[10px] md:text-xs font-bold text-slate-900">{getLabel(val)}</span>
       <span className="text-2xl md:text-5xl font-black text-slate-900">{getLabel(val)}</span>
       <span className="absolute bottom-1 right-1 text-[10px] md:text-xs font-bold text-slate-900 rotate-180">{getLabel(val)}</span>
    </div>
  );
};

export default function DragonTigerPage() {
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(60);
  const firestore = useFirestore();

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'dragon_tiger_results'),
      orderBy('period', 'desc'),
      limit(10)
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

    // Logic: Weighted RNG
    // 48% Dragon, 48% Tiger, 4% Tie
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
    <div className="flex flex-col gap-4 pb-24 bg-[#0a0515] min-h-screen -m-4 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between text-white mb-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black italic tracking-tighter text-rose-500 uppercase">Dragon vs Tiger</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white">
            <Gamepad2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Time Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {TIME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedTime(opt.id)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all border border-white/5",
              selectedTime === opt.id 
                ? "bg-gradient-to-b from-rose-900 to-[#0a0515] text-white shadow-[0_0_15px_rgba(225,29,72,0.3)] border-b-2 border-b-rose-500" 
                : "bg-slate-900/50 text-zinc-500"
            )}
          >
            <div className="mb-1">{opt.icon}</div>
            <span className="text-xs font-black uppercase text-center leading-tight">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Stats */}
      <div className="flex justify-between items-center text-white mb-2 px-2">
        <div className="flex flex-col">
           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Period</span>
           <span className="text-sm font-black font-mono tracking-tighter">{currentPeriod}</span>
        </div>
        <div className="text-right flex flex-col items-end">
           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Countdown</span>
           <div className="flex gap-1 mt-1">
              <span className="bg-slate-900 text-rose-500 font-mono text-xl font-black p-1 rounded min-w-[28px] text-center">00</span>
              <span className="text-rose-500 font-black self-center">:</span>
              {timeLeft.toString().padStart(2, '0').split('').map((char, i) => (
                <span key={i} className="bg-slate-900 text-rose-500 font-mono text-xl font-black p-1 rounded min-w-[28px] text-center">
                  {char}
                </span>
              ))}
           </div>
        </div>
      </div>

      {/* Arena Display */}
      <Card className="bg-gradient-to-br from-indigo-950 via-slate-950 to-rose-950 border-rose-500/20 shadow-2xl overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
          <div className="flex justify-around items-center gap-4 relative z-10">
            {/* Dragon */}
            <div className="flex flex-col items-center gap-3">
              <span className={cn(
                "text-lg font-black uppercase italic tracking-tighter transition-colors",
                history?.[0]?.winner === 'Dragon' ? "text-rose-500" : "text-zinc-500"
              )}>Dragon</span>
              <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/30">
                <CardIcon val={history?.[0]?.dragonCard || 1} winner={history?.[0]?.winner === 'Dragon'} />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="h-10 w-10 bg-yellow-500 rounded-full flex items-center justify-center font-black text-slate-950 shadow-[0_0_20px_rgba(234,179,8,0.5)]">VS</div>
              {history?.[0]?.winner === 'Tie' && <span className="text-yellow-500 font-black uppercase text-[10px] mt-2 animate-pulse">Tie Result</span>}
            </div>

            {/* Tiger */}
            <div className="flex flex-col items-center gap-3">
              <span className={cn(
                "text-lg font-black uppercase italic tracking-tighter transition-colors",
                history?.[0]?.winner === 'Tiger' ? "text-blue-500" : "text-zinc-500"
              )}>Tiger</span>
              <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/30">
                <CardIcon val={history?.[0]?.tigerCard || 1} winner={history?.[0]?.winner === 'Tiger'} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betting Zone Preview */}
      <div className="grid grid-cols-3 gap-3">
        <Button className="h-14 bg-rose-600 hover:bg-rose-700 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(159,18,57)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Dragon</Button>
        <Button className="h-14 bg-yellow-600 hover:bg-yellow-700 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(161,98,7)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Tie</Button>
        <Button className="h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-2xl shadow-[0_4px_0_rgb(29,78,216)] active:translate-y-1 active:shadow-none transition-all uppercase italic">Tiger</Button>
      </div>

      {/* Results History */}
      <div className="bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-500" />
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Recent Battles</span>
        </div>
        <table className="w-full text-center">
          <thead className="bg-slate-900/80 text-zinc-500 uppercase text-[9px] font-black">
            <tr>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Result</th>
              <th className="py-3 px-4">Cards</th>
            </tr>
          </thead>
          <tbody className="text-white text-xs font-bold divide-y divide-white/5">
            {history?.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-mono text-[9px] text-zinc-500">{row.period}</td>
                <td className="py-3 px-4">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                    row.winner === 'Dragon' ? 'bg-rose-500/20 text-rose-500' : 
                    row.winner === 'Tiger' ? 'bg-blue-500/20 text-blue-500' : 'bg-yellow-500/20 text-yellow-500'
                  )}>
                    {row.winner.charAt(0)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center gap-2 text-[10px] font-black">
                     <span className="text-rose-400">D:{row.dragonCard}</span>
                     <span className="text-zinc-600">|</span>
                     <span className="text-blue-400">T:{row.tigerCard}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
