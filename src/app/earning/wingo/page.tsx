
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Timer, 
  Info, 
  ChevronLeft, 
  History, 
  BarChart3, 
  User as UserIcon,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const TIME_OPTIONS = [
  { id: '30s', label: 'WinGo 30sec', icon: <Timer className="h-4 w-4" /> },
  { id: '1m', label: 'WinGo 1 Min', icon: <Zap className="h-4 w-4" /> },
  { id: '3m', label: 'WinGo 3 Min', icon: <Timer className="h-4 w-4" /> },
  { id: '5m', label: 'WinGo 5 Min', icon: <Timer className="h-4 w-4" /> },
];

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function WingoPage() {
  const [selectedTime, setSelectedTime] = useState('1m');
  const [timeLeft, setTimeLeft] = useState(59);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 59));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const s = seconds.toString().padStart(2, '0');
    return `00 : ${s}`;
  };

  const getNumberColor = (num: number) => {
    if (num === 0 || num === 5) return 'bg-gradient-to-br from-violet-500 to-red-500';
    if (num % 2 === 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex flex-col gap-4 pb-24 bg-slate-950 min-h-screen -m-4 p-4 overflow-x-hidden">
      {/* Header */}
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

      {/* Time Tabs */}
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

      {/* Main Game Card */}
      <Card className="bg-gradient-to-r from-cyan-500 to-emerald-400 border-none relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <CardContent className="p-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none h-7 px-3 text-[10px] font-black rounded-full uppercase">
              <Info className="h-3 w-3 mr-1" /> How to play
            </Button>
            <div className="mt-2">
               <p className="text-[10px] font-black text-white/80 uppercase">WinGo {selectedTime === '30s' ? '30sec' : '1 Min'}</p>
               <div className="flex gap-1 mt-1">
                  {[8, 2, 3, 4, 1].map((n, i) => (
                    <div key={i} className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white/20 shadow-lg", getNumberColor(n))}>
                      {n}
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
             <p className="text-[9px] font-mono text-slate-900 mt-2 font-black">20260425100051750</p>
          </div>
        </CardContent>
        {/* Divider SVG line */}
        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/20 border-dashed border-l border-white/40 hidden md:block"></div>
      </Card>

      {/* Prediction Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button className="h-12 bg-green-500 hover:bg-green-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all uppercase">Green</Button>
        <Button className="h-12 bg-violet-500 hover:bg-violet-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(109,40,217)] active:translate-y-1 active:shadow-none transition-all uppercase">Violet</Button>
        <Button className="h-12 bg-red-500 hover:bg-red-600 text-white font-black text-lg rounded-xl shadow-[0_4px_0_rgb(185,28,28)] active:translate-y-1 active:shadow-none transition-all uppercase">Red</Button>
      </div>

      {/* Number Grid */}
      <div className="bg-slate-900/50 p-4 rounded-3xl border border-white/5 shadow-xl">
        <div className="grid grid-cols-5 gap-3">
          {NUMBERS.map((num) => (
            <button
              key={num}
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

      {/* Multipliers & Quick Select */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <Button variant="outline" size="sm" className="bg-slate-900 border-white/10 text-slate-400 font-black text-[10px] rounded-lg h-8 uppercase px-4">Random</Button>
        <div className="flex gap-1">
          {['X1', 'X5', 'X10', 'X20', 'X50', 'X100'].map(m => (
            <Button key={m} variant="secondary" size="sm" className="bg-slate-800 text-slate-300 font-black text-[9px] h-7 w-9 p-0 rounded-md border border-white/5">{m}</Button>
          ))}
        </div>
      </div>

      {/* Big / Small */}
      <div className="grid grid-cols-2 gap-4">
        <Button className="h-14 bg-gradient-to-r from-orange-400 to-orange-600 text-white font-black text-xl rounded-2xl shadow-xl uppercase tracking-tighter border-b-4 border-orange-800">Big</Button>
        <Button className="h-14 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-black text-xl rounded-2xl shadow-xl uppercase tracking-tighter border-b-4 border-blue-800">Small</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900/80 p-1 rounded-2xl border border-white/5">
        <Button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'history' ? "bg-cyan-500 text-white" : "bg-transparent text-slate-500"
          )}
        >
          Game History
        </Button>
        <Button 
          onClick={() => setActiveTab('chart')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'chart' ? "bg-cyan-500 text-white" : "bg-transparent text-slate-500"
          )}
        >
          Chart
        </Button>
        <Button 
          onClick={() => setActiveTab('mine')}
          className={cn(
            "flex-1 h-10 font-black uppercase text-[10px] rounded-xl transition-all",
            activeTab === 'mine' ? "bg-cyan-500 text-white" : "bg-transparent text-slate-500"
          )}
        >
          My History
        </Button>
      </div>

      {/* Results Table */}
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
            {[
              { period: '20260425100051749', num: 8, bs: 'Big', color: 'bg-red-500' },
              { period: '20260425100051748', num: 2, bs: 'Small', color: 'bg-red-500' },
              { period: '20260425100051747', num: 5, bs: 'Big', color: 'bg-gradient-to-br from-violet-500 to-red-500' },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="py-3 px-4 font-mono text-[9px] text-slate-400">{row.period}</td>
                <td className={cn("py-3 px-4 text-lg font-black", row.num % 2 === 0 ? "text-red-500" : "text-green-500")}>{row.num}</td>
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
