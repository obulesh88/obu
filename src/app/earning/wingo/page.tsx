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
  History,
  TrendingUp,
  Coins,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp, updateDoc, increment, addDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useLayout } from '@/context/layout-context';

const TIME_OPTIONS = [
  { id: '1m', label: 'WinGo 1 Min', icon: <Zap className="h-4 w-4" /> },
  { id: '3m', label: 'WinGo 3 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '5m', label: 'WinGo 5 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '10m', label: 'WinGo 10 Min', icon: <Timer className="h-4 w-4" /> },
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
  const [activeTab, setActiveTab] = useState('history');
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    setPaddingDisabled(true);
    return () => setPaddingDisabled(false);
  }, [setPaddingDisabled]);

  // Betting state
  const [userBets, setUserBets] = useState<Record<string, number>>({
    green: 0,
    violet: 0,
    red: 0,
    big: 0,
    small: 0,
  });

  const resultsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'wingo_results'),
      orderBy('period', 'desc'),
      limit(10)
    );
  }, [firestore]);

  const { data: history } = useCollection<GameResult>(resultsQuery);

  const getNumberColor = (num: number) => {
    if (num === 0 || num === 5) return 'bg-gradient-to-br from-violet-500 to-red-500';
    if ([2, 4, 6, 8].includes(num)) return 'bg-red-500';
    return 'bg-green-500';
  };

  const generatePeriodId = useCallback(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return `${datePart}1000${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const currentPeriod = useMemo(() => isMounted ? generatePeriodId() : '...', [generatePeriodId, timeLeft, isMounted]);

  // Reset bets when period changes
  useEffect(() => {
    setUserBets({
      green: 0,
      violet: 0,
      red: 0,
      big: 0,
      small: 0,
    });
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
    const updateData = {
      'wallet.balance': increment(-selectedChip),
      updatedAt: serverTimestamp()
    };

    // Deduct balance
    updateDoc(userDocRef, updateData)
      .then(() => {
        // Log transaction
        const transactionsRef = collection(firestore, 'transactions');
        const txData = {
          userId: user.uid,
          amount: selectedChip,
          currency: 'INR',
          type: 'game',
          description: `WinGo Bet: ${category} (Period ${currentPeriod})`,
          createdAt: serverTimestamp()
        };
        addDoc(transactionsRef, txData);

        // Update local bet state
        setUserBets(prev => ({
          ...prev,
          [category]: (prev[category] || 0) + selectedChip
        }));

        toast({ title: 'Bet Placed!', description: `₹${selectedChip} on ${category.toUpperCase()}` });
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext));
        }
      });
  };

  const generateAndSaveResult = useCallback(async () => {
    if (!firestore || !user) return;
    
    const periodId = generatePeriodId();
    if (history?.some(h => h.period === periodId)) return;

    const r = Math.random() * 100;
    let num: number;

    if (r < 45) {
      const greenNums = [1, 3, 7, 9];
      num = greenNums[Math.floor(Math.random() * greenNums.length)];
    } else if (r < 90) {
      const redNums = [2, 4, 6, 8];
      num = redNums[Math.floor(Math.random() * redNums.length)];
    } else {
      const violetNums = [0, 5];
      num = violetNums[Math.floor(Math.random() * violetNums.length)];
    }

    const resultDocRef = doc(firestore, 'wingo_results', periodId);
    const resultData = {
      period: periodId,
      num: num,
      bs: num >= 5 ? 'Big' : 'Small',
      color: getNumberColor(num),
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

  const formatTime = (seconds: number) => {
    const s = (seconds % 60).toString().padStart(2, '0');
    return `00 : ${s}`;
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-slate-950 min-h-screen">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-950 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-between p-4 border-b border-white/5">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-black uppercase tracking-widest italic text-white">WinGo 1 Min</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Time Options */}
        <div className="grid grid-cols-4 gap-2">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedTime(opt.id)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl transition-all border border-white/5",
                selectedTime === opt.id 
                  ? "bg-gradient-to-b from-cyan-400 to-cyan-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                  : "bg-slate-900 text-slate-400"
              )}
            >
              <div className="mb-1">{opt.icon}</div>
              <span className="text-[9px] font-black uppercase text-center leading-tight">
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Dashboard Card */}
        <Card className="bg-gradient-to-r from-cyan-500 to-emerald-400 border-none relative overflow-hidden shadow-2xl rounded-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <CardContent className="p-6 flex justify-between items-center relative z-10">
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none h-8 px-4 text-xs font-black rounded-full uppercase">
                <Coins className="h-3 w-3 mr-2" /> ₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}
              </Button>
              <div className="mt-2">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Period</p>
                <p className="text-sm font-black text-white font-mono">{currentPeriod}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
               <p className="text-xs font-black text-white uppercase tracking-wider mb-2">Time Remaining</p>
               <div className="flex gap-1.5">
                 {formatTime(timeLeft).split('').map((char, i) => (
                   <span key={i} className={cn(
                     "bg-slate-900 text-white font-mono text-2xl font-black p-2 rounded-lg min-w-[32px] text-center shadow-2xl",
                     char === ':' && "bg-transparent text-slate-900 shadow-none px-0"
                   )}>
                     {char}
                   </span>
                 ))}
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Betting Zones */}
        <div className="grid grid-cols-3 gap-3">
          {['green', 'violet', 'red'].map((cat) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <Button 
                onClick={() => handleBet(cat)}
                className={cn(
                  "h-14 text-white font-black text-lg rounded-2xl shadow-xl active:translate-y-1 active:shadow-none transition-all uppercase",
                  cat === 'green' ? "bg-green-500 hover:bg-green-600 shadow-[0_5px_0_rgb(21,128,61)]" :
                  cat === 'violet' ? "bg-violet-500 hover:bg-violet-600 shadow-[0_5px_0_rgb(109,40,217)]" :
                  "bg-red-500 hover:bg-red-600 shadow-[0_5px_0_rgb(185,28,28)]"
                )}
              >
                {cat}
              </Button>
              <p className={cn("text-[9px] font-black text-center uppercase opacity-80", cat === 'green' ? 'text-green-500' : cat === 'violet' ? 'text-violet-500' : 'text-red-500')}>
                Spend: ₹{userBets[cat]}
              </p>
            </div>
          ))}
        </div>

        {/* Number Grid */}
        <div className="bg-slate-900/50 p-5 rounded-[32px] border border-white/5 shadow-2xl">
          <div className="grid grid-cols-5 gap-4">
            {NUMBERS.map((num) => (
              <button
                key={num}
                onClick={() => handleBet(`number_${num}`)}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center text-xl font-black text-white border-2 border-white/10 shadow-lg transition-transform active:scale-90 hover:scale-105",
                  getNumberColor(num)
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Big/Small Betting */}
        <div className="grid grid-cols-2 gap-4">
          {['big', 'small'].map((cat) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <Button 
                onClick={() => handleBet(cat)}
                className={cn(
                  "h-14 text-white font-black text-lg rounded-2xl shadow-xl active:translate-y-1 active:shadow-none transition-all uppercase",
                  cat === 'big' ? "bg-amber-500 hover:bg-amber-600 shadow-[0_5px_0_rgb(180,83,9)]" : "bg-blue-500 hover:bg-blue-600 shadow-[0_5px_0_rgb(29,78,216)]"
                )}
              >
                {cat}
              </Button>
              <p className={cn("text-[9px] font-black text-center uppercase opacity-80", cat === 'big' ? 'text-amber-500' : 'text-blue-500')}>
                Spend: ₹{userBets[cat]}
              </p>
            </div>
          ))}
        </div>

        {/* Chip Selection */}
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 flex items-center justify-around gap-2 shadow-inner">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setSelectedChip(chip)}
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center text-[11px] font-black transition-all transform active:scale-90",
                selectedChip === chip 
                  ? "bg-cyan-500 text-white scale-110 shadow-[0_0_20px_rgba(34,211,238,0.5)] border-2 border-white ring-4 ring-cyan-500/20" 
                  : "bg-slate-800 text-zinc-400 border border-white/10"
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* History/Chart Toggle */}
        <div className="flex gap-3 bg-slate-900/80 p-1.5 rounded-3xl border border-white/5">
          <Button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex-1 h-12 font-black uppercase text-xs rounded-2xl transition-all",
              activeTab === 'history' ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "bg-transparent text-slate-500"
            )}
          >
            <History className="h-4 w-4 mr-2" /> History
          </Button>
          <Button 
            onClick={() => setActiveTab('chart')}
            className={cn(
              "flex-1 h-12 font-black uppercase text-xs rounded-2xl transition-all",
              activeTab === 'chart' ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "bg-transparent text-slate-500"
            )}
          >
            <TrendingUp className="h-4 w-4 mr-2" /> Chart
          </Button>
        </div>

        {/* Results Table */}
        <div className="bg-slate-900/40 rounded-[32px] overflow-hidden border border-white/5 shadow-2xl mb-24">
          <table className="w-full text-center">
            <thead className="bg-cyan-600/20 text-cyan-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="py-4 px-6 text-left">Period</th>
                <th className="py-4 px-6 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="text-white text-xs font-bold divide-y divide-white/5">
              {history?.map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-mono text-[10px] text-slate-400 text-left">{row.period}</td>
                  <td className="py-4 px-6 uppercase italic tracking-tighter text-right text-cyan-400 font-black">{row.bs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!history || history.length === 0) && (
            <div className="py-20 text-center text-zinc-500 font-black uppercase text-xs tracking-widest opacity-20">
              Syncing Rounds...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
