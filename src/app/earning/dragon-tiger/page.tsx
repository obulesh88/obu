
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, History, Coins, Zap, Lock, Sword
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
import { useRouter } from 'next/navigation';

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
    <div key={`${period}-${label}`} className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <span className={cn(
        "text-xs font-black uppercase tracking-[0.2em] italic px-3 py-0.5 rounded-full border", 
        label === 'Dragon' ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-blue-500 border-blue-500/20 bg-blue-500/5"
      )}>
        {label}
      </span>
      <div className={cn(
        "h-48 w-32 bg-white rounded-2xl flex flex-col items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500", 
        winner ? "ring-8 ring-yellow-400 scale-110 shadow-[0_0_60px_rgba(234,179,8,0.7)] z-20" : "opacity-80 grayscale-[0.2]"
      )}>
         <span className={cn("absolute top-3 left-3 text-lg font-black flex flex-col items-center leading-none", isRed(val) ? "text-red-600" : "text-slate-950")}>
           {getLabel(val)}
           <span className="text-sm mt-1">{getSuite(val)}</span>
         </span>
         <span className={cn("text-7xl font-black", isRed(val) ? "text-red-600" : "text-slate-950")}>
           {getSuite(val)}
         </span>
         <span className={cn("absolute bottom-3 right-3 text-lg font-black flex flex-col items-center leading-none rotate-180", isRed(val) ? "text-red-600" : "text-slate-950")}>
           {getLabel(val)}
           <span className="text-sm mt-1">{getSuite(val)}</span>
         </span>
      </div>
    </div>
  );
};

export default function DragonTigerPage() {
  const { setPaddingDisabled } = useLayout();
  const router = useRouter();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedChip, setSelectedChip] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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
  const isBettingClosed = timeLeft <= 5;

  useEffect(() => {
    setUserBets({ dragon: 0, tie: 0, tiger: 0 });
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

    updateDoc(userDocRef, updateData)
      .then(() => {
        const txData = {
          userId: user.uid,
          amount: selectedChip,
          currency: 'INR',
          type: 'game',
          settled: false,
          description: `DT Bet: ${category.toUpperCase()} (Period ${currentPeriod})`,
          createdAt: serverTimestamp(),
          metadata: {
            gameType: 'dt',
            period: currentPeriod,
            bet: category,
            amount: selectedChip
          }
        };
        addDoc(collection(firestore, 'transactions'), txData)
          .catch(async (error: any) => {
            if (error.code === 'permission-denied') {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'transactions',
                operation: 'create',
                requestResourceData: txData
              } satisfies SecurityRuleContext));
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
          } satisfies SecurityRuleContext));
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

  if (!isMounted || loading || !user) return (
    <div className="p-0 bg-[#050308] min-h-screen flex items-center justify-center">
      <Skeleton className="h-40 w-40 rounded-full animate-pulse bg-zinc-900" />
    </div>
  );

  return (
    <div className="flex flex-col gap-0 pb-24 bg-[#050308] min-h-screen relative overflow-x-hidden text-white">
      {/* COMPACT STICKY HEADER */}
      <div className="flex items-center justify-between pt-6 pb-4 px-6 bg-black/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => router.push('/earning')}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black italic text-rose-500 uppercase tracking-tighter italic leading-none">DRAGON <span className="text-blue-500">TIGER</span></h1>
          <span className="text-[9px] font-black text-zinc-500 font-mono tracking-[0.2em] mt-1">{currentPeriod}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-primary/20 px-3 py-1 rounded-lg border border-primary/30 flex items-center gap-2">
             <Coins className="h-3 w-3 text-yellow-400" />
             <span className="text-xs font-black">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2">
             <Zap className={cn("h-3.5 w-3.5", isBettingClosed ? "text-red-500" : "text-yellow-500 fill-yellow-500")} />
             <span className={cn("text-xs font-black font-mono", isBettingClosed ? "text-red-500 animate-pulse" : "text-yellow-500")}>
               00:{timeLeft.toString().padStart(2, '0')}
             </span>
          </div>
        </div>
      </div>

      {/* BATTLE ARENA (ADJUSTED CARDS) */}
      <div className="flex flex-col items-center justify-center py-12 relative overflow-hidden bg-gradient-to-b from-black via-[#080610] to-[#050308]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.05)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="flex justify-center items-center gap-10 md:gap-20 z-10">
          {history?.[0] ? (
            <>
              <CardIcon 
                val={history[0].dragonCard} 
                winner={history[0].winner === 'Dragon'} 
                label="Dragon" 
                period={history[0].period} 
              />
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-zinc-950 border-4 border-white/5 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                   <div className="absolute inset-0 rounded-full animate-ping bg-rose-500/10" />
                   <span className="text-3xl font-black italic text-zinc-700 tracking-tighter z-10">VS</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full border border-white/5">
                    Result ID: {history[0].period.slice(-4)}
                  </span>
                </div>
              </div>
              <CardIcon 
                val={history[0].tigerCard} 
                winner={history[0].winner === 'Tiger'} 
                label="Tiger" 
                period={history[0].period} 
              />
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-6 text-zinc-800 font-black uppercase tracking-[0.4em] animate-pulse">
               <Sword className="h-16 w-16 opacity-20" />
               <span className="text-sm">Battle Pending...</span>
            </div>
          )}
        </div>
      </div>

      {/* BETTING ZONE */}
      <div className="px-5 pt-8 flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-4 h-52">
          {/* Dragon Button */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleBet('dragon')}
              disabled={isBettingClosed}
              className={cn(
                "flex-1 rounded-[32px] bg-gradient-to-br from-rose-600 to-rose-950 flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all border-b-8 border-rose-950",
                isBettingClosed && "opacity-50 grayscale shadow-none border-b-0 translate-y-2"
              )}
            >
              {isBettingClosed ? (
                <Lock className="h-8 w-8 text-rose-200/30" />
              ) : (
                <>
                  <span className="text-2xl font-black italic tracking-tighter uppercase leading-none text-rose-100">DRAGON</span>
                  <span className="text-[10px] font-black text-rose-200/50 uppercase tracking-widest">Payout 1.90</span>
                </>
              )}
            </button>
            <div className="h-11 rounded-full bg-zinc-950 flex items-center justify-center border border-white/5 shadow-inner">
               <span className="text-[11px] font-black uppercase text-rose-500">₹{userBets.dragon}</span>
            </div>
          </div>

          {/* Tie Button */}
          <div className="flex flex-col gap-3 pt-6">
            <button 
              onClick={() => handleBet('tie')}
              disabled={isBettingClosed}
              className={cn(
                "flex-1 rounded-[32px] bg-zinc-900/50 border-2 border-emerald-500/20 flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all border-b-4 border-emerald-950",
                isBettingClosed && "opacity-50 grayscale shadow-none border-b-0 translate-y-1"
              )}
            >
              <span className="text-xl font-black italic tracking-tighter uppercase leading-none text-emerald-500">TIE</span>
              <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest">Payout 9.0</span>
            </button>
            <div className="h-11 rounded-full bg-zinc-950 flex items-center justify-center border border-white/5 shadow-inner">
               <span className="text-[11px] font-black uppercase text-emerald-500">₹{userBets.tie}</span>
            </div>
          </div>

          {/* Tiger Button */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleBet('tiger')}
              disabled={isBettingClosed}
              className={cn(
                "flex-1 rounded-[32px] bg-gradient-to-br from-blue-600 to-blue-950 flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all border-b-8 border-blue-950",
                isBettingClosed && "opacity-50 grayscale shadow-none border-b-0 translate-y-2"
              )}
            >
              {isBettingClosed ? (
                <Lock className="h-8 w-8 text-blue-200/30" />
              ) : (
                <>
                  <span className="text-2xl font-black italic tracking-tighter uppercase leading-none text-blue-100">TIGER</span>
                  <span className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">Payout 1.90</span>
                </>
              )}
            </button>
            <div className="h-11 rounded-full bg-zinc-950 flex items-center justify-center border border-white/5 shadow-inner">
               <span className="text-[11px] font-black uppercase text-blue-500">₹{userBets.tiger}</span>
            </div>
          </div>
        </div>

        {/* CHIP SELECTOR */}
        <div className="bg-[#121225] p-6 rounded-[40px] border border-white/5 flex items-center justify-around gap-2 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          {CHIPS.map((chip) => (
            <button 
              key={chip} 
              onClick={() => setSelectedChip(chip)} 
              disabled={isBettingClosed}
              className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center text-sm font-black transition-all border-4", 
                selectedChip === chip 
                  ? "bg-yellow-500 text-slate-950 scale-115 shadow-[0_0_35px_rgba(234,179,8,0.6)] border-white ring-8 ring-yellow-500/10" 
                  : "bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700",
                isBettingClosed && "opacity-40 pointer-events-none"
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* COMPACT BATTLE LOG */}
        <div className="bg-black/40 rounded-[40px] overflow-hidden border border-white/5 shadow-2xl mb-12">
          <div className="p-5 border-b border-white/5 bg-white/5 flex items-center gap-3">
            <History className="h-4 w-4 text-zinc-600" />
            <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em]">LAST BATTLES</span>
          </div>
          <table className="w-full text-center">
            <tbody className="text-white text-[11px] font-black divide-y divide-white/5">
              {history?.slice(0, 8).map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-5 px-6 font-mono text-[9px] text-zinc-700 text-left">{row.period.slice(-4)}</td>
                  <td className="py-5 px-2 text-center">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-4 py-1 rounded-full", 
                      row.winner === 'Dragon' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                      row.winner === 'Tiger' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    )}>
                      {row.winner.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <div className="flex justify-end gap-3 text-[10px] font-black tabular-nums">
                      <span className="text-rose-400">{row.dragonCard}</span>
                      <span className="text-zinc-800">VS</span>
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
