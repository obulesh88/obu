'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Coins, Bomb, Diamond, RefreshCw, Trophy, Zap, Lock, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { useUser } from '@/hooks/use-user';
import { collection, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useLayout } from '@/context/layout-context';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useRouter } from 'next/navigation';

const GRID_SIZE = 25; // 5x5
const QUICK_BOMBS = [1, 3, 5, 10, 24];
const QUICK_BETS = [1, 5, 10, 50, 100];

type GameState = 'idle' | 'playing' | 'ended';

export default function MinesPage() {
  const { setPaddingDisabled } = useLayout();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();

  const [gameState, setGameState] = useState<GameState>('idle');
  const [betAmount, setBetAmount] = useState(1);
  const [mineCount, setMineCount] = useState(3);
  const [revealed, setRevealed] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [revealedGems, setRevealedGems] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setPaddingDisabled(true);
    return () => setPaddingDisabled(false);
  }, [setPaddingDisabled]);

  useEffect(() => {
    setIsMounted(true);
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const combinations = (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = (res * (n - i + 1)) / i;
    }
    return res;
  };

  const currentMultiplier = useMemo(() => {
    if (revealedGems === 0) return 1;
    const houseEdge = 0.96; // Slightly better for user
    const prob = combinations(GRID_SIZE - mineCount, revealedGems) / combinations(GRID_SIZE, revealedGems);
    return Number((1 / prob * houseEdge).toFixed(2));
  }, [revealedGems, mineCount]);

  const nextMultiplier = useMemo(() => {
    const nextGems = revealedGems + 1;
    if (nextGems > GRID_SIZE - mineCount) return currentMultiplier;
    const houseEdge = 0.96;
    const prob = combinations(GRID_SIZE - mineCount, nextGems) / combinations(GRID_SIZE, nextGems);
    return Number((1 / prob * houseEdge).toFixed(2));
  }, [revealedGems, mineCount, currentMultiplier]);

  const startGame = async () => {
    if (!user || !userProfile || !firestore || isProcessing) return;
    if (userProfile.wallet.balance < betAmount) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    setIsProcessing(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const updateData = {
      'wallet.balance': increment(-betAmount),
      'wallet.wageringRequired': increment(-betAmount),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(userDocRef, updateData);
      
      const txData = {
        userId: user.uid,
        amount: betAmount,
        currency: 'INR',
        type: 'game',
        settled: false,
        description: `Mines Bet: ${mineCount} Mines`,
        createdAt: serverTimestamp(),
        metadata: {
          gameType: 'mines',
          bet: 'start',
          amount: betAmount,
          mines: mineCount
        }
      };
      await addDoc(collection(firestore, 'transactions'), txData);

      const positions: number[] = [];
      while (positions.length < mineCount) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        if (!positions.includes(r)) positions.push(r);
      }
      setMinePositions(positions);
      setRevealed(Array(GRID_SIZE).fill(false));
      setRevealedGems(0);
      setGameState('playing');
      toast({ title: 'Game Started!', description: 'Avoid the bombs!' });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updateData
        } satisfies SecurityRuleContext));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCellClick = (index: number) => {
    if (gameState !== 'playing' || revealed[index] || isProcessing) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (minePositions.includes(index)) {
      setGameState('ended');
      toast({ 
        variant: 'destructive', 
        title: 'BOOM! 💣', 
        description: 'You hit a mine.',
        className: "bg-rose-600 text-white font-black"
      });
    } else {
      const newCount = revealedGems + 1;
      setRevealedGems(newCount);
      if (newCount === GRID_SIZE - mineCount) {
        handleCashOut();
      }
    }
  };

  const handleCashOut = async () => {
    if (gameState !== 'playing' || revealedGems === 0 || !user || !firestore || isProcessing) return;

    setIsProcessing(true);
    const winAmount = Number((betAmount * currentMultiplier).toFixed(2));
    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
      await updateDoc(userDocRef, {
        'wallet.balance': increment(winAmount),
        updatedAt: serverTimestamp()
      });
      
      const txData = {
        userId: user.uid,
        amount: winAmount,
        currency: 'INR',
        type: 'game',
        description: `Mines Win: ${revealedGems} Gems`,
        createdAt: serverTimestamp(),
        settled: true
      };
      await addDoc(collection(firestore, 'transactions'), txData);
      
      setGameState('ended');
      toast({ 
        title: 'CASHED OUT! 💰', 
        description: `Won ₹${winAmount}`,
        className: "bg-emerald-600 text-white font-black"
      });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { 'wallet.balance': increment(winAmount) }
        } satisfies SecurityRuleContext));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted || loading || !user) return (
    <div className="p-0 bg-[#020617] min-h-screen flex items-center justify-center">
      <Skeleton className="h-40 w-40 rounded-full animate-pulse bg-slate-900" />
    </div>
  );

  return (
    <div className="flex flex-col bg-[#020617] min-h-screen text-white overflow-x-hidden pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between pt-6 pb-4 px-6 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => router.push('/earning')}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black italic text-blue-500 uppercase tracking-tighter leading-none">MINES</h1>
          <div className="flex items-center gap-1 mt-1">
             <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />
             <span className="text-[8px] font-black text-zinc-500 font-mono tracking-[0.2em] uppercase">Provably Fair</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-blue-600/20 px-3 py-1.5 rounded-xl border border-blue-500/30 flex items-center gap-2">
             <Coins className="h-3 w-3 text-yellow-400" />
             <span className="text-xs font-black">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-6">
        {/* STAT CARDS */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-[#0f172a] p-4 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 right-0 p-1 opacity-20"><Zap className="h-10 w-10 text-blue-400" /></div>
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Multiplier</span>
              <div className="text-2xl font-black text-blue-400 font-mono">x{currentMultiplier}</div>
           </div>
           <div className="bg-[#0f172a] p-4 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 right-0 p-1 opacity-20"><Trophy className="h-10 w-10 text-emerald-400" /></div>
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Current Win</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">₹{(betAmount * currentMultiplier).toFixed(2)}</div>
           </div>
        </div>

        {/* MINE GRID */}
        <div className="bg-slate-950/50 p-3 rounded-[32px] border border-white/5 backdrop-blur-sm relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />
          <div className="grid grid-cols-5 gap-2 md:gap-3 aspect-square relative z-10">
            {revealed.map((isRevealed, i) => {
              const isMine = minePositions.includes(i);
              const showReal = isRevealed || gameState === 'ended';

              return (
                <button
                  key={i}
                  onClick={() => handleCellClick(i)}
                  disabled={gameState !== 'playing' || isRevealed}
                  className={cn(
                    "relative rounded-xl border-b-4 transition-all duration-300 flex items-center justify-center group overflow-hidden",
                    !showReal 
                      ? "bg-[#1e293b] border-[#0f172a] hover:bg-[#334155] active:translate-y-1 active:border-b-0" 
                      : isMine 
                        ? "bg-rose-500/20 border-rose-950 scale-95 ring-2 ring-rose-500/30" 
                        : "bg-blue-500/20 border-blue-950 scale-95 ring-2 ring-blue-500/30"
                  )}
                >
                  {!showReal ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-900 group-hover:bg-blue-400/50 transition-colors" />
                  ) : isMine ? (
                    <Bomb className="h-7 w-7 text-rose-500 animate-in zoom-in-50 duration-300" />
                  ) : (
                    <Diamond className="h-7 w-7 text-blue-400 animate-in zoom-in-50 duration-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTROL PANEL */}
        <div className="bg-[#0f172a] p-6 rounded-[40px] border border-white/5 shadow-2xl mt-auto space-y-6">
          {gameState === 'idle' || gameState === 'ended' ? (
            <>
              {/* BOMB COUNT SELECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Select Mines</span>
                  <span className="text-xs font-black font-mono text-rose-500 px-2 py-0.5 bg-rose-500/10 rounded border border-rose-500/20">{mineCount} BOMBS</span>
                </div>
                <div className="bg-black/20 p-1.5 rounded-2xl border border-white/5 flex items-center justify-between gap-1">
                  {QUICK_BOMBS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setMineCount(count)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[11px] font-black transition-all",
                        mineCount === count 
                          ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] border-2 border-white/20" 
                          : "text-zinc-600 hover:text-zinc-400"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* BET AMOUNT SELECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Wager Amount</span>
                  <span className="text-xs font-black font-mono text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">₹{betAmount}</span>
                </div>
                <div className="bg-black/20 p-1.5 rounded-2xl border border-white/5 flex items-center justify-between gap-1">
                  {QUICK_BETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[11px] font-black transition-all",
                        betAmount === amt 
                          ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border-2 border-white/20" 
                          : "text-zinc-600 hover:text-zinc-400"
                      )}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={startGame} 
                disabled={isProcessing}
                className="h-16 w-full rounded-[24px] bg-gradient-to-br from-blue-600 to-blue-800 font-black text-xl uppercase tracking-tighter shadow-2xl active:translate-y-1 transition-all border-b-8 border-blue-950"
              >
                {gameState === 'ended' && <RefreshCw className="mr-3 h-5 w-5" />}
                {gameState === 'ended' ? 'PLAY AGAIN' : 'START GAME'}
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-500">
               <div className="flex justify-between items-center p-5 bg-blue-500/5 rounded-[24px] border border-blue-500/20">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-blue-400 mb-1">Current Payout</span>
                    <div className="text-3xl font-black text-white font-mono">₹{(betAmount * currentMultiplier).toFixed(2)}</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase text-zinc-500 mb-1">Next Gem</span>
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-emerald-400" />
                      <span className="text-base font-black text-emerald-400 font-mono">x{nextMultiplier}</span>
                    </div>
                  </div>
               </div>
               <Button 
                  onClick={handleCashOut} 
                  disabled={isProcessing || revealedGems === 0}
                  className={cn(
                    "h-16 w-full rounded-[24px] font-black text-xl uppercase tracking-tight shadow-2xl active:translate-y-1 transition-all border-b-8",
                    revealedGems === 0 ? "bg-zinc-800 border-zinc-950 opacity-50 cursor-not-allowed" : "bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-950 text-white"
                  )}
                >
                  <Trophy className="mr-3 h-6 w-6" /> CASH OUT
                </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
