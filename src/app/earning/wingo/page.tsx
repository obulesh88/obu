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
  const { toast } = useToast();
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeTab, setActiveTab] = useState('history');
  const [selectedChip, setSelectedChip] = useState(10);
  const [isMounted, setIsMounted] = useState(false);
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

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
    <div className="flex flex-col gap-4 pb-24 bg-slate-950 min-h-screen -m-4 p-4 overflow-x-hidden">
      <div className="flex items-center justify-between text-white mb-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-black uppercase tracking-widest italic">WinGo 1 Min</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Info className="h-5 w-5" />
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
                ? "bg-gradient-to-b from-cyan-400 to-cyan-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                : "bg-slate-900 text-slate-400"
            )}
          >
            <div className="mb-1">{opt.icon}</div>
            <span className="text-[9px] font-black uppercase text-center leading-tight">
              {opt.label.split(' ')[0]}<br/>{opt.label.split(' ').slice(1).join(' ')}
            </span>
          </button>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-cyan-500 to-emerald-400 border-none relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <CardContent className="p-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none h-7 px-3 text-[10px] font-black rounded-full uppercase">
              <Coins className="h-3 w-3 mr-1" /> ₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}
            </Button>
            <div className="mt-2">
               <p className="text-[10px] font-black text-white/80 uppercase">Recent Results</p>
               <div className="flex gap-1 mt-1">
                  {history?.slice(0, 5).map((res, i) => (
                    <div key={i} className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white/20 shadow-lg animate-in zoom-in-50", res.color)}>
                      {res.num}
                    </div>
                  ))}
               </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
             <p className="text-xs font-black text-white uppercase tracking-wider mb-1">Time remaining</p>
             <div className="flex gap-1">
               {formatTime(timeLeft).split('').map((char, i) => (
                 <span key={i} className={cn(
                   "bg-slate-900 text-white font-mono text-xl font-black p-1.5 rounded min-w-[24px] text-center shadow-inner",
                   char === ':' && "bg-transparent text-slate-900 shadow-none"
                 )}>
                   {char}
                 </span>
               ))}
             </div>
             <p className="text-[9px] font-mono text-slate-900 mt-2 font-black">{currentPeriod}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <Button 
            onClick={() => handleBet('green')}
            className="h-12 bg-green-500 hover:bg-green-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all uppercase"
          >
            Green
          </Button>
          <p className="text-[9px] font-black text-center text-green-500/80 uppercase">Spend: ₹{userBets.green}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button 
            onClick={() => handleBet('violet')}
            className="h-12 bg-violet-500 hover:bg-violet-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(109,40,217)] active:translate-y-1 active:shadow-none transition-all uppercase"
          >
            Violet
          </Button>
          <p className="text-[9px] font-black text-center text-violet-500/80 uppercase">Spend: ₹{userBets.violet}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button 
            onClick={() => handleBet('red')}
            className="h-12 bg-red-500 hover:bg-red-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(185,28,28)] active:translate-y-1 active:shadow-none transition-all uppercase"
          >
            Red
          </Button>
          <p className="text-[9px] font-black text-center text-red-500/80 uppercase">Spend: ₹{userBets.red}</p>
        </div>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 shadow-xl">
        <div className="grid grid-cols-5 gap-3">
          {NUMBERS.map((num) => (
            <button
              key={num}
              onClick={() => handleBet(`number_${num}`)}
              className={cn(
                "aspect-square rounded-full flex items-center justify-center text-xl font-black text-white border-2 border-white/10 shadow-lg transition-transform active:scale-90",
                getNumberColor(num)
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Button 
            onClick={() => handleBet('big')}
            className="h-12 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(180,83,9)] active:translate-y-1 active:shadow-none transition-all uppercase"
          >
            Big
          </Button>
          <p className="text-[9px] font-black text-center text-amber-500/80 uppercase">Spend: ₹{userBets.big}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button 
            onClick={() => handleBet('small')}
            className="h-12 bg-blue-500 hover:bg-blue-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(29,78,216)] active:translate-y-1 active:shadow-none transition-all uppercase"
          >
            Small
          </Button>
          <p className="text-[9px] font-black text-center text-blue-500/80 uppercase">Spend: ₹{userBets.small}</p>
        </div>
      </div>

      <div className="bg-slate-900/50 p-3 rounded-2xl border border-white/5 flex items-center justify-around gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setSelectedChip(chip)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all transform active:scale-90",
              selectedChip === chip 
                ? "bg-cyan-500 text-white scale-110 shadow-[0_0_15px_rgba(34,211,238,0.5)] border-2 border-white" 
                : "bg-slate-800 text-zinc-400 border border-white/10"
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex gap-2 bg-slate-900/80 p-1 rounded-2xl border border-white/5">
        <Button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'history' ? "bg-cyan-500 text-white" : "bg-transparent text-slate-500"
          )}
        >
          <History className="h-3 w-3 mr-2" /> Game History
        </Button>
        <Button 
          onClick={() => setActiveTab('chart')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'chart' ? "bg-cyan-500 text-white" : "bg-transparent text-slate-500"
          )}
        >
          <TrendingUp className="h-3 w-3 mr-2" /> Chart
        </Button>
      </div>

      <div className="bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5">
        <table className="w-full text-center">
          <thead className="bg-cyan-600/20 text-cyan-400 uppercase text-[10px] font-black">
            <tr>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Number</th>
              <th className="py-3 px-4">Big Small</th>
              <th className="py-3 px-4">Color</th>
            </tr>
          </thead>
          <tbody className="text-white text-xs font-bold divide-y divide-white/5">
            {history?.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-mono text-[9px] text-slate-400">{row.period}</td>
                <td className={cn("py-3 px-4 text-lg font-black", [1,3,7,9].includes(row.num) ? "text-green-500" : [2,4,6,8].includes(row.num) ? "text-red-500" : "text-violet-500")}>
                  {row.num}
                </td>
                <td className="py-3 px-4 uppercase italic tracking-tighter">{row.bs}</td>
                <td className="py-3 px-4">
                  <div className={cn("h-3 w-3 rounded-full mx-auto shadow-sm", row.color)}></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
