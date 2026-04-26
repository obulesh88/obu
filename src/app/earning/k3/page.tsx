'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Timer, ChevronLeft, Zap, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, History, Gamepad2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';

const TIME_OPTIONS = [
  { id: '1m', label: 'K3 1 Min', icon: <Zap className="h-4 w-4" /> },
];
const CHIPS = [1, 5, 10, 50, 100];

type K3Result = { id?: string; period: string; dice: number[]; sum: number; oe: 'Odd' | 'Even'; };

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
  const { setPaddingDisabled } = useLayout();
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    setPaddingDisabled(true);
    return () => setPaddingDisabled(false);
  }, [setPaddingDisabled]);

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'k3_results'), orderBy('period', 'desc'), limit(15));
  }, [firestore]);

  const { data: history } = useCollection<K3Result>(resultsQuery);

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}3000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const currentPeriod = useMemo(() => isMounted ? generatePeriodId() : '...', [generatePeriodId, timeLeft, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setTimeLeft(60 - new Date().getSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isMounted) return <div className="p-4 bg-[#0a052e] min-h-screen"><Skeleton className="h-full w-full" /></div>;

  return (
    <div className="flex flex-col gap-0 bg-[#0a052e] min-h-screen">
      <div className="sticky top-0 z-50 bg-[#0a052e]/90 backdrop-blur-md flex items-center justify-between p-4 border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black italic text-white">K3 Lotre</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white"><Gamepad2 className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-center">
          {TIME_OPTIONS.map((opt) => (
            <button key={opt.id} onClick={() => setSelectedTime(opt.id)} className={cn("flex flex-col items-center justify-center p-3 px-8 rounded-2xl transition-all border border-white/5", selectedTime === opt.id ? "bg-gradient-to-b from-[#1b106b] to-[#0a052e] text-white border-b-2 border-b-blue-500" : "bg-[#161145] text-zinc-400")}>
              <div className="mb-1">{opt.icon}</div>
              <span className="text-[9px] font-black uppercase text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center text-white px-1">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Period</span>
             <span className="text-sm font-black font-mono tracking-tighter">{currentPeriod}</span>
          </div>
          <div className="text-right flex flex-col items-end">
             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time Remaining</span>
             <div className="flex gap-1 mt-1">
                {['0', '0', ':', ...timeLeft.toString().padStart(2, '0').split('')].map((char, i) => (
                  <span key={i} className={cn("flex items-center justify-center font-mono text-xl font-black rounded min-w-[28px] h-10", char === ':' ? "text-blue-400" : "bg-[#161145] text-blue-400 shadow-inner")}>{char}</span>
                ))}
             </div>
          </div>
        </div>

        <div className="bg-[#05a065] p-3 rounded-3xl relative overflow-hidden border-2 border-[#05a065]/50">
          <div className="bg-[#1b106b] rounded-2xl p-8 flex justify-around items-center relative z-10">
            {history?.[0]?.dice.map((d, i) => (
              <div key={i} className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl animate-in zoom-in-75">
                <DiceIcon num={d} className="h-14 w-14 text-[#1b106b]" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161145]/60 p-4 rounded-3xl border border-white/5 flex items-center justify-around gap-2">
          {CHIPS.map((chip) => (
            <button key={chip} onClick={() => setSelectedChip(chip)} className={cn("h-12 w-12 rounded-full flex items-center justify-center text-[11px] font-black transition-all", selectedChip === chip ? "bg-blue-500 text-white scale-110 shadow-[0_0_20px_rgba(59,130,246,0.6)] border-2 border-white ring-4 ring-blue-500/20" : "bg-[#0a052e] text-zinc-400 border border-white/10")}>{chip}</button>
          ))}
        </div>

        <div className="bg-[#161145]/40 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl mb-24">
          <div className="p-4 border-b border-white/5 bg-[#1b106b]/50 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Game History</span>
          </div>
          <table className="w-full text-center">
            <thead className="bg-[#1e1465] text-zinc-400 uppercase text-[10px] font-black tracking-widest">
              <tr><th className="py-4 px-4">Period</th><th className="py-4 px-4">Sum</th><th className="py-4 px-4">Result</th></tr>
            </thead>
            <tbody className="text-white text-sm font-bold divide-y divide-white/5">
              {history?.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-mono text-[10px] text-zinc-500">{row.period}</td>
                  <td className="py-4 px-4 text-base font-black text-blue-400">{row.sum}</td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {row.dice.map((d, di) => (
                          <div key={di} className="bg-white rounded-sm p-0.5 transform scale-90"><DiceIcon num={d} className="h-4 w-4 text-[#161145]" /></div>
                        ))}
                      </div>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full ml-1", row.oe === 'Odd' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500')}>{row.oe.charAt(0)}</span>
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
