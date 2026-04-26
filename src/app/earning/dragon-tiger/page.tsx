'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Timer, ChevronLeft, Trophy, History, Users, Sword, Coins, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase, useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const CHIPS = [1, 5, 10, 50, 100];

type DTResult = { 
  id?: string; 
  period: string; 
  dragonCard: number; 
  tigerCard: number; 
  winner: 'Dragon' | 'Tiger' | 'Tie'; 
  createdAt: any; 
};

const CardIcon = ({ val, winner, label, period }: { val: number, winner: boolean, label: string, period: string }) => {
  const getLabel = (v: number) => {
    if (v === 1) return 'A'; 
    if (v === 11) return 'J'; 
    if (v === 12) return 'Q'; 
    if (v === 13) return 'K'; 
    return v.toString();
  };
  
  const getSuite = (v: number) => {
    const suites = ['♠', '♥', '♣', '♦'];
    return suites[v % 4];
  };

  const isRed = (v: number) => (v % 4 === 1 || v % 4 === 3);

  return (
    <div key={`${period}-${label}`} className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest italic", 
        label === 'Dragon' ? "text-rose-500" : "text-blue-500"
      )}>
        {label}
      </span>
      <div className={cn(
        "h-32 w-22 bg-white rounded-xl flex flex-col items-center justify-center relative shadow-2xl transition-all", 
        winner ? "ring-4 ring-yellow-400 scale-110 z-20 shadow-[0_0_30px_rgba(234,179,8,0.5)]" : "opacity-90 z-10"
      )}>
         <span className={cn("absolute top-2 left-2 text-xs font-black flex flex-col items-center leading-none", isRed(val) ? "text-red-600" : "text-slate-900")}>
           {getLabel(val)}
           <span className="text-[10px]">{getSuite(val)}</span>
         </span>
         <span className={cn("text-4xl font-black", isRed(val) ? "text-red-600" : "text-slate-900")}>
           {getSuite(val)}
         </span>
         <span className={cn("absolute bottom-2 right-2 text-xs font-black flex flex-col items-center leading-none rotate-180", isRed(val) ? "text-red-600" : "text-slate-900")}>
           {getLabel(val)}
           <span className="text-[10px]">{getSuite(val)}</span>
         </span>
      </div>
    </div>
  );
};

export default function DragonTigerPage() {
  const { setPaddingDisabled } = useLayout();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  const [userBets, setUserBets] = useState<Record<string, number>>({
    dragon: 0, tie: 0, tiger: 0
  });

  useEffect(() => {
    setPaddingDisabled(true);
    return () => setPaddingDisabled(false);
  }, [setPaddingDisabled]);

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'dragon_tiger_results'), orderBy('period', 'desc'), limit(15));
  }, [firestore]);

  const { data: history } = useCollection<DTResult>(resultsQuery);

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}4000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const currentPeriod = useMemo(() => isMounted ? generatePeriodId() : '...', [generatePeriodId, timeLeft, isMounted]);

  useEffect(() => {
    setUserBets({ dragon: 0, tie: 0, tiger: 0 });
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
          description: `DT Bet: ${category.toUpperCase()} (Period ${currentPeriod})`,
          createdAt: serverTimestamp()
        });
        setUserBets(prev => ({ ...prev, [category]: (prev[category] || 0) + selectedChip }));
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

  if (!isMounted) return <div className="p-0 bg-[#050308] min-h-screen"><Skeleton className="h-full w-full" /></div>;

  const currentResult = history?.[0];

  return (
    <div className="flex flex-col gap-0 pb-24 bg-[#050308] min-h-screen relative overflow-x-hidden text-white">
      {/* PROFESSIONAL HEADER (Screenshot Style) */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 px-6 relative bg-black">
        <Button variant="ghost" size="icon" className="absolute left-4 top-6 text-white" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black italic text-rose-500 uppercase tracking-tighter italic">DRAGON VS TIGER</h1>
          <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-widest">{currentPeriod}</span>
        </div>
        <div className="absolute right-6 top-6 flex items-center gap-1">
           <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
           <span className="text-sm font-black text-yellow-500 font-mono">00:{timeLeft.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* MINI ROADMAP (Screenshot Style) */}
      <div className="bg-[#1a1525] py-3 flex gap-1.5 overflow-x-auto scrollbar-hide px-6 justify-center">
        {history?.slice(0, 15).reverse().map((res, i) => (
          <div key={i} className={cn(
            "h-5 w-5 rounded-full flex-shrink-0 border border-white/10", 
            res.winner === 'Dragon' ? "bg-blue-600" : res.winner === 'Tiger' ? "bg-rose-600" : "bg-emerald-500"
          )} />
        ))}
      </div>

      {/* BETTING PAD (Screenshot Style) */}
      <div className="px-4 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-3 h-44">
          {/* Dragon Button */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleBet('dragon')}
              className="flex-1 rounded-2xl bg-red-600 flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"
            >
              <span className="text-2xl font-black italic tracking-tighter uppercase leading-none text-red-100/40">DRAGON</span>
              <span className="text-[10px] font-bold text-red-200/60 uppercase">Payout 1 : 1</span>
            </button>
            <div className="h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
               <span className="text-[10px] font-black uppercase text-rose-500">Spend: ₹{userBets.dragon}</span>
            </div>
          </div>

          {/* Tie Button */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleBet('tie')}
              className="flex-1 rounded-2xl bg-[#0a2e1e] border-2 border-emerald-500/30 flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"
            >
              <span className="text-2xl font-black italic tracking-tighter uppercase leading-none text-emerald-400">TIE</span>
              <span className="text-[10px] font-bold text-emerald-500/60 uppercase">Payout 1 : 8</span>
            </button>
            <div className="h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
               <span className="text-[10px] font-black uppercase text-emerald-500">Spend: ₹{userBets.tie}</span>
            </div>
          </div>

          {/* Tiger Button */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleBet('tiger')}
              className="flex-1 rounded-2xl bg-[#0a1a4a] border-2 border-blue-500/30 flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"
            >
              <span className="text-2xl font-black italic tracking-tighter uppercase leading-none text-blue-500">TIGER</span>
              <span className="text-[10px] font-bold text-blue-500/60 uppercase">Payout 1 : 1</span>
            </button>
            <div className="h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
               <span className="text-[10px] font-black uppercase text-blue-500">Spend: ₹{userBets.tiger}</span>
            </div>
          </div>
        </div>

        {/* CHIP SELECTOR (Screenshot Style) */}
        <div className="bg-[#121225] p-6 rounded-[32px] border border-white/5 flex items-center justify-around gap-2 shadow-inner">
          {CHIPS.map((chip) => (
            <button 
              key={chip} 
              onClick={() => setSelectedChip(chip)} 
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center text-xs font-black transition-all border-4", 
                selectedChip === chip 
                  ? "bg-yellow-500 text-slate-950 scale-110 shadow-[0_0_25px_rgba(234,179,8,0.5)] border-white ring-4 ring-yellow-500/20" 
                  : "bg-slate-800 text-zinc-400 border-zinc-700/50"
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* BATTLE RECORDS (Screenshot Style) */}
        <div className="bg-[#121225] rounded-[32px] overflow-hidden border border-white/5 shadow-2xl mb-12">
          <div className="p-5 border-b border-white/5 bg-[#1a1525]/50 flex items-center gap-3">
            <History className="h-4 w-4 text-zinc-500" />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">BATTLE RECORDS</span>
          </div>
          <table className="w-full text-center">
            <thead className="bg-[#1a1525] text-zinc-500 uppercase text-[9px] font-black tracking-widest">
              <tr>
                <th className="py-4 px-6 text-left">PERIOD</th>
                <th className="py-4 px-2 text-center">WINNER</th>
                <th className="py-4 px-6 text-right">BATTLE</th>
              </tr>
            </thead>
            <tbody className="text-white text-xs font-bold divide-y divide-white/5">
              {history?.slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-5 px-6 font-mono text-[9px] text-zinc-600 text-left">{row.period}</td>
                  <td className="py-5 px-2 text-center">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-3 py-1 rounded-full", 
                      row.winner === 'Dragon' ? 'bg-rose-500/20 text-rose-500' : 
                      row.winner === 'Tiger' ? 'bg-blue-500/20 text-blue-500' : 
                      'bg-emerald-500/20 text-emerald-500'
                    )}>
                      {row.winner.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <div className="flex justify-end gap-2 text-[10px] font-black tabular-nums">
                      <span className="text-rose-400">{row.dragonCard}</span>
                      <span className="text-zinc-700 uppercase">vs</span>
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
