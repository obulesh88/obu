'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Timer, 
  Info, 
  ChevronLeft, 
  Zap,
  History,
  Coins,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection } from '@/firebase';
import { useUser } from '@/hooks/use-user';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useLayout } from '@/context/layout-context';

const TIME_OPTIONS = [
  { id: '1m', label: '1 Min', icon: <Zap className="h-4 w-4" /> },
];

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const CHIPS = [1, 5, 10, 50, 100];

type GameResult = {
  id?: string;
  period: string;
  num: number;
  bs: 'Big' | 'Small';
  color: string;
};

export default function WingoPage() {
  const { setPaddingDisabled } = useLayout();
  const { toast } = useToast();
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    setPaddingDisabled(true);
    return () => setPaddingDisabled(false);
  }, [setPaddingDisabled]);

  const [userBets, setUserBets] = useState<Record<string, number>>({
    green: 0, violet: 0, red: 0, big: 0, small: 0,
  });

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'wingo_results'),
      orderBy('period', 'desc'),
      limit(15)
    );
  }, [firestore]);

  const { data: history } = useCollection<GameResult>(resultsQuery);

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}1000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const currentPeriod = useMemo(() => isMounted ? generatePeriodId() : '...', [generatePeriodId, timeLeft, isMounted]);
  const isBettingClosed = timeLeft <= 5;

  useEffect(() => {
    setUserBets({ green: 0, violet: 0, red: 0, big: 0, small: 0 });
  }, [currentPeriod]);

  const handleBet = async (category: string) => {
    if (isBettingClosed) {
      toast({ variant: 'destructive', title: 'Betting Closed', description: 'Please wait for the next round.' });
      return;
    }
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
    
    updateDoc(userDocRef, updateData).then(() => {
        addDoc(collection(firestore, 'transactions'), {
          userId: user.uid, 
          amount: selectedChip, 
          currency: 'INR', 
          type: 'game',
          settled: false,
          description: `WinGo Bet: ${category} (Period ${currentPeriod})`, 
          createdAt: serverTimestamp(),
          metadata: {
            gameType: 'wingo',
            period: currentPeriod,
            bet: category,
            amount: selectedChip
          }
        });
        setUserBets(prev => ({ ...prev, [category]: (prev[category] || 0) + selectedChip }));
        toast({ title: 'Bet Placed!', description: `₹${selectedChip} on ${category.toUpperCase()}` });
      }).catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: updateData }));
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

  if (!isMounted) return <div className="p-4 bg-slate-950 min-h-screen"><Skeleton className="h-full w-full" /></div>;

  return (
    <div className="flex flex-col bg-[#050510] min-h-screen overflow-x-hidden">
      <div className="sticky top-0 z-50 bg-[#050510]/90 backdrop-blur-md flex items-center justify-between p-4 border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">WinGo 1 Min</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white"><Info className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex justify-center">
          {TIME_OPTIONS.map((opt) => (
            <button key={opt.id} onClick={() => setSelectedTime(opt.id)} className={cn("flex flex-col items-center justify-center p-3 px-8 rounded-2xl transition-all border border-white/5", selectedTime === opt.id ? "bg-gradient-to-b from-cyan-600 to-cyan-900 text-white border-b-2 border-b-cyan-400" : "bg-[#101025] text-zinc-500")}>
              <div className="mb-1">{opt.icon}</div>
              <span className="text-[9px] font-black uppercase text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>

        <Card className="bg-gradient-to-br from-cyan-500 to-emerald-500 border-none relative overflow-hidden shadow-2xl rounded-3xl">
          <CardContent className="p-6 flex justify-between items-center relative z-10">
            <div className="flex flex-col gap-3">
              <div className="bg-black/20 backdrop-blur-md rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/10 w-fit">
                <Coins className="h-3 w-3 text-yellow-300" />
                <span className="text-xs font-black text-white">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Period ID</span>
                <span className="text-sm font-black text-white font-mono tracking-tight">{currentPeriod}</span>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end gap-1">
               <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Count Down</span>
               <div className="flex gap-1 mt-1">
                {['0', '0', ':', ...timeLeft.toString().padStart(2, '0').split('')].map((char, i) => (
                  <span key={i} className={cn("flex items-center justify-center font-mono text-xl font-black rounded h-10 w-7", char === ':' ? "text-white" : "bg-black/30 text-white backdrop-blur-md", isBettingClosed && !char.includes(':') && "text-red-500")}>
                    {char}
                  </span>
                ))}
               </div>
               {isBettingClosed && (
                 <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter mt-1 animate-pulse">Betting Closed</span>
               )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {['green', 'violet', 'red'].map((cat) => (
            <div key={cat} className="flex flex-col gap-2">
              <Button 
                onClick={() => handleBet(cat)} 
                disabled={isBettingClosed}
                className={cn(
                  "h-16 text-white font-black text-lg rounded-2xl shadow-xl active:translate-y-1 transition-all uppercase", 
                  cat === 'green' ? "bg-green-500 shadow-[0_6px_0_rgb(21,128,61)]" : cat === 'violet' ? "bg-violet-500 shadow-[0_6px_0_rgb(109,40,217)]" : "bg-red-500 shadow-[0_6px_0_rgb(185,28,28)]",
                  isBettingClosed && "opacity-50 grayscale shadow-none"
                )}
              >
                {isBettingClosed ? <Lock className="h-4 w-4" /> : cat}
              </Button>
              <div className={cn("text-[9px] font-black text-center uppercase py-1 rounded-full bg-white/5", cat === 'green' ? 'text-green-500' : cat === 'violet' ? 'text-violet-500' : 'text-red-500')}>Spend: ₹{userBets[cat]}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#101025] p-5 rounded-[32px] border border-white/5">
          <div className="grid grid-cols-5 gap-3">
            {NUMBERS.map((num) => (
              <button 
                key={num} 
                onClick={() => handleBet(`number_${num}`)} 
                disabled={isBettingClosed}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center text-xl font-black text-white border-2 border-white/10 transition-all", 
                  (num === 0 || num === 5) ? 'bg-gradient-to-br from-violet-500 to-red-500' : ([2, 4, 6, 8].includes(num) ? 'bg-red-500' : 'bg-green-500'),
                  isBettingClosed && "opacity-20 scale-90"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {['big', 'small'].map((cat) => (
            <div key={cat} className="flex flex-col gap-2">
              <Button 
                onClick={() => handleBet(cat)} 
                disabled={isBettingClosed}
                className={cn(
                  "h-16 text-white font-black text-lg rounded-2xl shadow-xl active:translate-y-1 transition-all uppercase", 
                  cat === 'big' ? "bg-amber-500 shadow-[0_6px_0_rgb(180,83,9)]" : "bg-blue-500 shadow-[0_6px_0_rgb(29,78,216)]",
                  isBettingClosed && "opacity-50 grayscale shadow-none"
                )}
              >
                {isBettingClosed ? <Lock className="h-4 w-4" /> : cat}
              </Button>
              <div className={cn("text-[9px] font-black text-center uppercase py-1 rounded-full bg-white/5", cat === 'big' ? 'text-amber-500' : 'text-blue-500')}>Spend: ₹{userBets[cat]}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#101025]/60 p-4 rounded-3xl border border-white/5 flex items-center justify-around gap-2">
          {CHIPS.map((chip) => (
            <button 
              key={chip} 
              onClick={() => setSelectedChip(chip)} 
              disabled={isBettingClosed}
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center text-[11px] font-black transition-all", 
                selectedChip === chip 
                  ? "bg-cyan-500 text-white scale-110 shadow-[0_0_20px_rgba(34,211,238,0.6)] border-2 border-white ring-4 ring-cyan-500/20" 
                  : "bg-slate-900 text-zinc-500 border border-white/10",
                isBettingClosed && "opacity-50"
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="bg-[#101025]/40 rounded-[32px] overflow-hidden border border-white/5 mb-24">
          <div className="p-4 border-b border-white/5 bg-cyan-600/10 flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Battle Records</span>
          </div>
          <table className="w-full text-center">
            <thead className="bg-cyan-600/20 text-cyan-400/60 uppercase text-[9px] font-black tracking-widest">
              <tr>
                <th className="py-4 px-6 text-left">Period</th>
                <th className="py-4 px-6 text-center">Number</th>
                <th className="py-4 px-6 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="text-white text-[11px] font-bold divide-y divide-white/5">
              {history?.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-mono text-[10px] text-zinc-500 text-left">{row.period}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={cn("h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-black text-white border border-white/10", row.color)}>
                      {row.num}
                    </span>
                  </td>
                  <td className="py-4 px-6 uppercase italic text-right text-cyan-400 font-black text-sm">{row.bs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
