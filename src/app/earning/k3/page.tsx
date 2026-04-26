'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Timer, 
  Info, 
  ChevronLeft, 
  Zap,
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  History,
  TrendingUp,
  Gamepad2,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const TIME_OPTIONS = [
  { id: '1m', label: 'K3 1 Min', icon: <Zap className="h-4 w-4" /> },
  { id: '3m', label: 'K3 3 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '5m', label: 'K3 5 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '10m', label: 'K3 10 Min', icon: <Timer className="h-4 w-4" /> },
];

const SUM_MULTIPLIERS: Record<number, string> = {
  3: '207.36', 4: '69.12', 5: '34.56', 6: '20.74', 
  7: '13.83', 8: '9.88', 9: '8.3', 10: '7.68', 
  11: '7.68', 12: '8.3', 13: '9.88', 14: '13.83', 
  15: '20.74', 16: '34.56', 17: '69.12', 18: '207.36'
};

const CHIPS = [1, 5, 10, 50, 100];

type K3Result = {
  id?: string;
  period: string;
  dice: number[];
  sum: number;
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
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeTab, setActiveTab] = useState('history');
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'k3_results'),
      orderBy('period', 'desc'),
      limit(10)
    );
  }, [firestore]);

  const { data: history } = useCollection<K3Result>(resultsQuery);

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}3000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const currentPeriod = useMemo(() => isMounted ? generatePeriodId() : '...', [generatePeriodId, timeLeft, isMounted]);

  const generateAndSaveResult = useCallback(async () => {
    if (!firestore || !user) return;

    const periodId = generatePeriodId();
    if (history?.some(h => h.period === periodId)) return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2 + d3;

    const resultDocRef = doc(firestore, 'k3_results', periodId);
    const resultData = {
      period: periodId,
      dice: [d1, d2, d3],
      sum: sum,
      oe: sum % 2 === 0 ? 'Even' : 'Odd',
      createdAt: serverTimestamp()
    };

    setDoc(resultDocRef, resultData)
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: resultDocRef.path,
            operation: 'create',
            requestResourceData: resultData,
          } satisfies SecurityRuleContext));
        }
      });
  }, [firestore, user, generatePeriodId, history]);

  useEffect(() => {
    setIsMounted(true);
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

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-[#0a052e] min-h-screen">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24 bg-[#0a052e] min-h-screen -m-4 p-4 overflow-x-hidden">
      <div className="flex items-center justify-between text-white mb-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black italic tracking-tighter">OR wallet.Game</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white">
            <Gamepad2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        {TIME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedTime(opt.id)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl transition-all border border-white/5",
              selectedTime === opt.id 
                ? "bg-gradient-to-b from-[#1b106b] to-[#0a052e] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] border-b-2 border-b-blue-500" 
                : "bg-[#161145] text-zinc-400"
            )}
          >
            <div className="mb-1">{opt.icon}</div>
            <span className="text-[9px] font-black uppercase text-center leading-tight">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center text-white mb-2 px-2">
        <div className="flex flex-col">
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Period</span>
           <span className="text-sm font-black font-mono tracking-tighter">{currentPeriod}</span>
        </div>
        <div className="text-right flex flex-col items-end">
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Time Remaining</span>
           <div className="flex gap-1 mt-1">
              <span className="bg-[#161145] text-blue-400 font-mono text-xl font-black p-1 rounded min-w-[28px] text-center">0</span>
              <span className="bg-[#161145] text-blue-400 font-mono text-xl font-black p-1 rounded min-w-[28px] text-center">0</span>
              <span className="text-blue-400 font-black self-center">:</span>
              {timeLeft.toString().padStart(2, '0').split('').map((char, i) => (
                <span key={i} className="bg-[#161145] text-blue-400 font-mono text-xl font-black p-1 rounded min-w-[28px] text-center">
                  {char}
                </span>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-[#05a065] p-3 rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(5,160,101,0.3)] border-2 border-[#05a065]/50">
        <div className="bg-[#1b106b] rounded-2xl p-6 flex justify-around items-center relative z-10">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-8 bg-[#05a065] rounded-r-full"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-8 bg-[#05a065] rounded-l-full"></div>
          {history?.[0]?.dice.map((d, i) => (
            <div key={i} className="h-16 w-16 bg-white rounded-xl flex items-center justify-center shadow-2xl transform transition-transform animate-in zoom-in-75 duration-500">
              <DiceIcon num={d} className="h-12 w-12 text-[#1b106b]" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#161145]/60 p-3 rounded-2xl border border-white/5 flex items-center justify-around gap-2 mt-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setSelectedChip(chip)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all transform active:scale-90",
              selectedChip === chip 
                ? "bg-blue-500 text-white scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-white" 
                : "bg-[#0a052e] text-zinc-400 border border-white/10"
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex gap-2 bg-[#161145]/80 p-1 rounded-2xl border border-white/5 mt-2">
        <Button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'history' ? "bg-[#1b106b] text-white border border-blue-500/50" : "bg-transparent text-slate-500"
          )}
        >
          <History className="h-3 w-3 mr-2" /> History
        </Button>
        <Button 
          onClick={() => setActiveTab('chart')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'chart' ? "bg-[#1b106b] text-white border border-blue-500/50" : "bg-transparent text-slate-500"
          )}
        >
          <TrendingUp className="h-3 w-3 mr-2" /> Chart
        </Button>
      </div>

      <div className="bg-[#161145]/40 rounded-3xl overflow-hidden border border-white/5 mt-2">
        <table className="w-full text-center">
          <thead className="bg-[#1e1465] text-zinc-400 uppercase text-[9px] font-black">
            <tr>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Sum</th>
              <th className="py-3 px-4">Results</th>
            </tr>
          </thead>
          <tbody className="text-white text-xs font-bold divide-y divide-white/5">
            {history?.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-mono text-[9px] text-zinc-500">{row.period}</td>
                <td className="py-3 px-4 text-sm font-black text-blue-400">{row.sum}</td>
                <td className="py-3 px-4">
                  <div className="flex justify-center gap-1">
                    {row.dice.map((d, di) => (
                      <div key={di} className="bg-white rounded-[2px] p-0.5 shadow-sm">
                        <DiceIcon num={d} className="h-4 w-4 text-[#161145]" />
                      </div>
                    ))}
                    <span className={cn(
                      "text-[8px] font-black uppercase self-center px-1.5 py-0.5 rounded ml-2",
                      row.oe === 'Odd' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'
                    )}>
                      {row.oe.charAt(0)}
                    </span>
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
