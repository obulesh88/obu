'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Coins, Bomb, Diamond, Plus, Minus, RefreshCw, Trophy, Zap, Lock
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
const MIN_BET = 1;
const MAX_BET = 1000;

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
    // house edge ~0.95 to approximate user request
    const houseEdge = 0.95; 
    const prob = combinations(GRID_SIZE - mineCount, revealedGems) / combinations(GRID_SIZE, revealedGems);
    return Number((1 / prob * houseEdge).toFixed(2));
  }, [revealedGems, mineCount]);

  const nextMultiplier = useMemo(() => {
    const nextGems = revealedGems + 1;
    if (nextGems > GRID_SIZE - mineCount) return currentMultiplier;
    const houseEdge = 0.95;
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

    updateDoc(userDocRef, updateData)
      .then(() => {
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
        addDoc(collection(firestore, 'transactions'), txData);

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
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData
          } satisfies SecurityRuleContext));
        }
      })
      .finally(() => setIsProcessing(false));
  };

  const handleCellClick = (index: number) => {
    if (gameState !== 'playing' || revealed[index] || isProcessing) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (minePositions.includes(index)) {
      setGameState('ended');
      toast({ variant: 'destructive', title: 'GAME OVER! 💣', description: 'You hit a mine.' });
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
    
    updateDoc(userDocRef, {
      'wallet.balance': increment(winAmount),
      updatedAt: serverTimestamp()
    }).then(() => {
      const txData = {
        userId: user.uid,
        amount: winAmount,
        currency: 'INR',
        type: 'game',
        description: `Mines Win: ${revealedGems} Gems`,
        createdAt: serverTimestamp(),
        settled: true
      };
      addDoc(collection(firestore, 'transactions'), txData);
      setGameState('ended');
      toast({ title: 'CASHED OUT! 💰', description: `Win: ₹${winAmount}` });
    }).catch(async (error: any) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { 'wallet.balance': increment(winAmount) }
        } satisfies SecurityRuleContext));
      }
    }).finally(() => setIsProcessing(false));
  };

  if (!isMounted || loading || !user) return (
    <div className="p-0 bg-[#050b1d] min-h-screen flex items-center justify-center">
      <Skeleton className="h-40 w-40 rounded-3xl animate-pulse bg-slate-900" />
    </div>
  );

  return (
    <div className="flex flex-col bg-[#050b1d] min-h-screen text-white overflow-hidden pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 bg-black/40 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => router.push('/earning')}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black italic text-blue-500 uppercase tracking-tighter leading-none">MINES</h1>
          <span className="text-[8px] font-black text-zinc-500 font-mono tracking-[0.2em] mt-1">PROVABLY FAIR</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-blue-600/20 px-3 py-1.5 rounded-lg border border-blue-500/30 flex items-center gap-2">
             <Coins className="h-3 w-3 text-yellow-400" />
             <span className="text-xs font-black">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6">
        {/* GAME INFO CARDS */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-[#0a122a] p-4 rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center text-center">
              <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">Current Multiplier</span>
              <div className="flex items-center gap-2">
                 <Zap className="h-3 w-3 text-blue-400 fill-blue-400" />
                 <span className="text-lg font-black text-blue-400 font-mono">x{currentMultiplier}</span>
              </div>
           </div>
           <div className="bg-[#0a122a] p-4 rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center text-center">
              <span className="text-[10px] font-black uppercase text-zinc-500 mb-1">Potential Win</span>
              <div className="flex items-center gap-2">
                 <Coins className="h-3 w-3 text-emerald-400" />
                 <span className="text-lg font-black text-emerald-400 font-mono">₹{(betAmount * currentMultiplier).toFixed(2)}</span>
              </div>
           </div>
        </div>

        {/* GRID CONTAINER */}
        <div className="bg-black/30 p-4 rounded-[32px] border border-white/5 backdrop-blur-sm">
          <div className="grid grid-cols-5 gap-2 md:gap-3 aspect-square">
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
                      ? "bg-[#16274e] border-[#0a122a] hover:bg-[#1d3366] hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-0" 
                      : isMine 
                        ? "bg-rose-600/30 border-rose-950 scale-95 ring-2 ring-rose-500/20" 
                        : "bg-emerald-600/30 border-emerald-950 scale-95 ring-2 ring-emerald-500/20"
                  )}
                >
                  {!showReal ? (
                    <div className="h-2 w-2 rounded-full bg-[#0a122a] group-hover:bg-blue-400/30 transition-colors" />
                  ) : isMine ? (
                    <Bomb className="h-8 w-8 text-rose-500 animate-in zoom-in-50 duration-300" />
                  ) : (
                    <Diamond className="h-8 w-8 text-emerald-400 animate-in zoom-in-50 duration-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col gap-6 bg-[#0a122a] p-6 rounded-[40px] border border-white/5 shadow-2xl mt-auto">
          {gameState === 'idle' || gameState === 'ended' ? (
            <>
              {/* Bet Amount Controls */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Bet Amount</span>
                  <span className="text-xs font-black font-mono text-blue-400">₹{betAmount}</span>
                </div>
                <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                  {QUICK_BETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className={cn(
                        "flex-1 min-w-[50px] py-2 rounded-lg text-[10px] font-black transition-all border",
                        betAmount === amt ? "bg-blue-600 border-blue-400 text-white" : "bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mine Count Controls */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Bomb Count</span>
                  <span className="text-xs font-black font-mono text-rose-500">{mineCount} Mines</span>
                </div>
                <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                  {QUICK_BOMBS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setMineCount(count)}
                      className={cn(
                        "flex-1 min-w-[50px] py-2 rounded-lg text-[10px] font-black transition-all border",
                        mineCount === count ? "bg-rose-600 border-rose-400 text-white" : "bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={startGame} 
                disabled={isProcessing}
                className="h-16 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 font-black text-lg uppercase tracking-tighter shadow-xl active:scale-95 transition-all border-b-8 border-blue-900"
              >
                {gameState === 'ended' && <RefreshCw className="mr-3 h-5 w-5" />}
                {gameState === 'ended' ? 'PLAY AGAIN' : 'PLACE BET'}
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-6">
               <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-blue-400">Current Payout</span>
                    <div className="text-2xl font-black text-white font-mono">₹{(betAmount * currentMultiplier).toFixed(2)}</div>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[9px] font-black uppercase text-zinc-500">Next Payout</span>
                    <span className="text-sm font-black text-zinc-300 font-mono">₹{(betAmount * nextMultiplier).toFixed(2)}</span>
                  </div>
               </div>
               <Button 
                  onClick={handleCashOut} 
                  disabled={isProcessing || revealedGems === 0}
                  className={cn(
                    "h-16 w-full rounded-2xl font-black text-lg uppercase tracking-tight shadow-xl active:scale-95 transition-all border-b-8",
                    revealedGems === 0 ? "bg-zinc-800 border-zinc-950 opacity-50" : "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-900"
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
