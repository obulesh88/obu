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
        "h-36 w-24 bg-white rounded-xl flex flex-col items-center justify-center relative shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all", 
        winner ? "ring-4 ring-yellow-400 scale-110 z-20 shadow-[0_0_50px_rgba(234,179,8,0.4)]" : "opacity-95 z-10"
      )}>
         <span className={cn("absolute top-2 left-2 text-sm font-black flex flex-col items-center leading-none", isRed(val) ? "text-red-600" : "text-slate-900")}>
           {getLabel(val)}
           <span className="text-xs">{getSuite(val)}</span>
         </span>
         <span className={cn("text-5xl font-black", isRed(val) ? "text-red-600" : "text-slate-900")}>
           {getSuite(val)}
         </span>
         <span className={cn("absolute bottom-2 right-2 text-sm font-black flex flex-col items-center leading-none rotate-180", isRed(val) ? "text-red-600" : "text-slate-900")}>
           {getLabel(val)}
           <span className="text-xs">{getSuite(val)}</span>
         </span>
      </div>
    </div>
  );
};

export default function DragonTigerPage() {
  const { setPaddingDisabled } = useLayout();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  const [userBets, setUserBets] = useState<Record<string, number>>({
    dragon: 0, tie: 0, tiger: 0
  });

  const dealerImage = PlaceHolderImages.find(img => img.id === 'user-avatar')?.imageUrl || '';

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

  if (!isMounted) return <div className="p-0 bg-[#050308] min-h-screen"><Skeleton className="h-full w-full" /></div>;

  const currentResult = history?.[0];

  return (
    <div className="flex flex-col gap-0 pb-24 bg-[#050308] min-h-screen relative overflow-x-hidden">
      {/* Professional Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black text-rose-500 uppercase tracking-tighter italic leading-none">Dragon vs Tiger</h1>
          <span className="text-[10px] font-bold text-zinc-500 font-mono mt-1 tracking-widest">{currentPeriod}</span>
        </div>
        <div className="flex items-center gap-2">
           <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
           <span className="text-xs font-black text-yellow-500 font-mono">00:{timeLeft.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Mini Roadmap */}
      <div className="bg-[#1a1525] p-2 border-b border-white/5 flex gap-1 overflow-x-auto scrollbar-hide px-4">
        {history?.slice(0, 15).reverse().map((res, i) => (
          <div key={i} className="flex-shrink-0">
            <div className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white/10", 
              res.winner === 'Dragon' ? "bg-rose-600 text-white" : res.winner === 'Tiger' ? "bg-blue-600 text-white" : "bg-emerald-500 text-white"
            )}>
              {res.winner.charAt(0)}
            </div>
          </div>
        ))}
      </div>

      {/* Main Dealer/Card Table */}
      <div className="relative h-[360px] w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1525] via-[#050308] overflow-hidden">
        <div className="absolute top-0 w-full flex justify-center opacity-30">
           <div className="relative h-44 w-44 mt-4 rounded-full overflow-hidden border-4 border-white/5 grayscale">
              <Image 
                src={dealerImage} 
                alt="Dealer" 
                fill 
                className="object-cover" 
                data-ai-hint="dealer portrait" 
              />
           </div>
        </div>
        
        {/* Card Arena with Animations */}
        <div key={currentResult?.period} className="relative z-20 w-full flex justify-around items-end px-4 mt-12">
          <CardIcon 
            label="Dragon" 
            val={currentResult?.dragonCard || 1} 
            winner={currentResult?.winner === 'Dragon'} 
            period={currentResult?.period || 'initial'} 
          />
          
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="h-14 w-14 bg-yellow-500 rounded-full flex items-center justify-center font-black text-slate-950 shadow-[0_0_40px_rgba(234,179,8,0.5)] z-30 border-4 border-slate-950 animate-bounce">VS</div>
            <div className="flex flex-col items-center gap-1">
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payout</span>
               <span className="text-xs font-black text-white italic">Tie 1:8</span>
            </div>
          </div>
          
          <CardIcon 
            label="Tiger" 
            val={currentResult?.tigerCard || 1} 
            winner={currentResult?.winner === 'Tiger'} 
            period={currentResult?.period || 'initial'} 
          />
        </div>

        {/* Dynamic Status Bar */}
        <div className="absolute bottom-4 w-full flex justify-between px-6 z-10">
           <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Users className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] font-black text-zinc-300 uppercase">1.2k Active</span>
           </div>
           <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Coins className="h-3 w-3 text-yellow-500" />
              <span className="text-[10px] font-black text-yellow-500 uppercase">Balance: ₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</span>
           </div>
        </div>
      </div>

      {/* Betting Pad */}
      <div className="p-4 flex flex-col gap-4 bg-[#0a0515]">
        <div className="grid grid-cols-3 gap-3">
          {['dragon', 'tie', 'tiger'].map((side) => (
            <div key={side} className="flex flex-col gap-2">
              <Button 
                onClick={() => handleBet(side)}
                className={cn(
                  "h-28 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all shadow-xl active:translate-y-1", 
                  side === 'dragon' ? 'bg-rose-600/20 border-2 border-rose-500/40 text-rose-500 shadow-rose-950/20' : 
                  side === 'tiger' ? 'bg-blue-600/20 border-2 border-blue-500/40 text-blue-500 shadow-blue-950/20' : 
                  'bg-emerald-600/20 border-2 border-emerald-500/40 text-emerald-500 shadow-emerald-950/20'
                )}
              >
                <span className="text-2xl font-black italic tracking-tighter uppercase leading-none">{side}</span>
                <span className="text-[10px] font-bold opacity-60">Payout 1 : {side === 'tie' ? '8' : '1'}</span>
              </Button>
              <div className={cn(
                "text-[10px] font-black text-center uppercase py-1.5 rounded-full bg-white/5",
                side === 'dragon' ? "text-rose-500" : side === 'tiger' ? "text-blue-500" : "text-emerald-500"
              )}>
                Spend: ₹{userBets[side]}
              </div>
            </div>
          ))}
        </div>

        {/* Chip Selector */}
        <div className="flex items-center justify-around bg-slate-900/50 p-4 rounded-3xl border border-white/5">
          {CHIPS.map((chip) => (
            <button 
              key={chip} 
              onClick={() => setSelectedChip(chip)} 
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2", 
                selectedChip === chip ? "bg-yellow-500 text-slate-950 scale-110 shadow-[0_0_20px_rgba(234,179,8,0.5)] border-white ring-4 ring-yellow-500/20" : "bg-slate-800 text-zinc-400 border-white/10"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="px-4 pb-24 bg-[#0a0515]">
        <div className="bg-slate-900/40 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
          <div className="p-5 border-b border-white/5 bg-[#1a1525]/50 flex items-center gap-2">
            <History className="h-4 w-4 text-zinc-500" />
            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Battle Records</span>
          </div>
          <table className="w-full text-center">
            <thead className="bg-[#1a1525] text-zinc-500 uppercase text-[9px] font-black tracking-widest">
              <tr>
                <th className="py-4 px-4 text-left">Period</th>
                <th className="py-4 px-4">Winner</th>
                <th className="py-4 px-4 text-right">Battle</th>
              </tr>
            </thead>
            <tbody className="text-white text-xs font-bold divide-y divide-white/5">
              {history?.slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-mono text-[9px] text-zinc-600 text-left">{row.period}</td>
                  <td className="py-4 px-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-3 py-1 rounded-full", 
                      row.winner === 'Dragon' ? 'bg-rose-500/20 text-rose-500' : 
                      row.winner === 'Tiger' ? 'bg-blue-500/20 text-blue-500' : 
                      'bg-emerald-500/20 text-emerald-500'
                    )}>
                      {row.winner}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-3 text-[10px] font-black tabular-nums">
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
