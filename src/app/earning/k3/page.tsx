'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Timer, ChevronLeft, Zap, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, History, Gamepad2, Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection } from '@/firebase';
import { useUser } from '@/hooks/use-user';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const TIME_OPTIONS = [
  { id: '1m', label: 'K3 1 Min', icon: <Zap className="h-4 w-4" /> },
];
const CHIPS = [1, 5, 10, 50, 100];

type K3Result = { id?: string; period: string; dice: number[]; sum: number; oe: 'Odd' | 'Even'; bs: 'Big' | 'Small'; };

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
  const { toast } = useToast();
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  const [userBets, setUserBets] = useState<Record<string, number>>({
    big: 0, small: 0, odd: 0, even: 0
  });

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
    setUserBets({ big: 0, small: 0, odd: 0, even: 0 });
  }, [currentPeriod]);

  const handleBet = async (category: string) => {
    if (!user || !userProfile || !firestore) {
      toast({ variant: 'destructive', title: 'Login Required' });
      return;
    }
    if (userProfile.wallet.balance < selectedChip) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const updateData = { 'wallet.balance': increment(-selectedChip), updatedAt: serverTimestamp() };

    updateDoc(userDocRef, updateData)
      .then(() => {
        addDoc(collection(firestore, 'transactions'), {
          userId: user.uid,
          amount: selectedChip,
          currency: 'INR',
          type: 'game',
          settled: false,
          description: `K3 Bet: ${category.toUpperCase()} (Period ${currentPeriod})`,
          createdAt: serverTimestamp(),
          metadata: {
            gameType: 'k3',
            period: currentPeriod,
            bet: category,
            amount: selectedChip
          }
        });
        setUserBets(prev => ({ ...prev, [category]: (prev[category] || 0) + selectedChip }));
        toast({ title: 'Bet Placed!', description: `₹${selectedChip} on ${category.toUpperCase()}` });
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData
          }));
        }
      });
  };

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
          <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">K3 Lotre</h1>
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

        <div className="bg-[#1b106b] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
              <Coins className="h-3 w-3 text-yellow-400" />
              <span className="text-xs font-black">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Period</span>
               <span className="text-sm font-black font-mono tracking-tighter">{currentPeriod}</span>
            </div>
          </div>

          <div className="bg-black/30 rounded-2xl p-6 flex justify-around items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <div className="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                <span className="text-[8px] font-black text-blue-400 uppercase">Counting</span>
              </div>
            </div>
            {history?.[0]?.dice.map((d, i) => (
              <div key={i} className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl animate-in zoom-in-75">
                <DiceIcon num={d} className="h-10 w-10 text-[#1b106b]" />
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Next Draw In</span>
             <div className="flex gap-1">
                {['0', '0', ':', ...timeLeft.toString().padStart(2, '0').split('')].map((char, i) => (
                  <span key={i} className={cn("flex items-center justify-center font-mono text-xl font-black rounded min-w-[32px] h-12", char === ':' ? "text-blue-400" : "bg-[#161145] text-blue-400 shadow-inner")}>{char}</span>
                ))}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
           <div className="flex flex-col gap-2">
             <Button onClick={() => handleBet('big')} className="h-16 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xl rounded-2xl shadow-xl active:translate-y-1 transition-all uppercase italic">
                Big
             </Button>
             <div className="text-[9px] font-black text-center uppercase py-1 rounded-full bg-white/5 text-amber-500">Spend: ₹{userBets.big}</div>
           </div>
           <div className="flex flex-col gap-2">
             <Button onClick={() => handleBet('small')} className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-xl rounded-2xl shadow-xl active:translate-y-1 transition-all uppercase italic">
                Small
             </Button>
             <div className="text-[9px] font-black text-center uppercase py-1 rounded-full bg-white/5 text-blue-500">Spend: ₹{userBets.small}</div>
           </div>
           <div className="flex flex-col gap-2">
             <Button onClick={() => handleBet('odd')} className="h-16 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black text-xl rounded-2xl shadow-xl active:translate-y-1 transition-all uppercase italic">
                Odd
             </Button>
             <div className="text-[9px] font-black text-center uppercase py-1 rounded-full bg-white/5 text-rose-500">Spend: ₹{userBets.odd}</div>
           </div>
           <div className="flex flex-col gap-2">
             <Button onClick={() => handleBet('even')} className="h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-xl rounded-2xl shadow-xl active:translate-y-1 transition-all uppercase italic">
                Even
             </Button>
             <div className="text-[9px] font-black text-center uppercase py-1 rounded-full bg-white/5 text-emerald-500">Spend: ₹{userBets.even}</div>
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
            <thead className="bg-[#1e1465] text-zinc-400 uppercase text-[9px] font-black tracking-widest">
              <tr><th className="py-4 px-4 text-left">Period</th><th className="py-4 px-4 text-center">Sum</th><th className="py-4 px-4 text-right">Result</th></tr>
            </thead>
            <tbody className="text-white text-xs font-bold divide-y divide-white/5">
              {history?.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-mono text-[9px] text-zinc-500 text-left">{row.period}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-blue-400 leading-none">{row.sum}</span>
                      <div className="flex gap-0.5 mt-1">
                        {row.dice.map((d, di) => (
                          <div key={di} className="bg-white rounded-sm p-0.5 transform scale-75"><DiceIcon num={d} className="h-3 w-3 text-[#161145]" /></div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", row.oe === 'Odd' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500')}>
                        {row.oe}
                      </span>
                      <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", row.bs === 'Big' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500')}>
                        {row.bs}
                      </span>
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
