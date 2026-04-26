'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, updateDoc, increment, addDoc, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Global component that handles automatic generation of game results
 * and strict settling of user bets after the round concludes.
 */
export function GameAutomationManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const lastResultGeneratedMinute = useRef<number | null>(null);
  const isSettling = useRef(false);

  // Generates a Period ID based on a specific date/time
  const getPeriodId = useCallback((gameType: 'wingo' | 'k3' | 'dt', date: Date) => {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const typeCode = gameType === 'wingo' ? '1000' : gameType === 'k3' ? '3000' : '4000';
    return `${datePart}${typeCode}${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const runResultGeneration = useCallback(async () => {
    if (!firestore || !user) return;

    const now = new Date();
    const currentMinute = now.getMinutes();

    // Result generation should happen at the start of a new minute for the PREVIOUS minute
    if (lastResultGeneratedMinute.current === currentMinute) return;
    lastResultGeneratedMinute.current = currentMinute;

    // We generate results for the minute that just ended
    const prevMinuteDate = new Date(now.getTime() - 60000);
    
    const games: ('wingo' | 'k3' | 'dt')[] = ['wingo', 'k3', 'dt'];

    for (const gameType of games) {
      const periodId = getPeriodId(gameType, prevMinuteDate);
      const resRef = doc(firestore, `${gameType}_results`, periodId);
      const resSnap = await getDoc(resRef);

      if (!resSnap.exists()) {
        let data: any = { period: periodId, createdAt: serverTimestamp() };

        if (gameType === 'wingo') {
          const r = Math.random() * 100;
          let num: number;
          if (r < 45) num = [1, 3, 7, 9][Math.floor(Math.random() * 4)];
          else if (r < 90) num = [2, 4, 6, 8][Math.floor(Math.random() * 4)];
          else num = [0, 5][Math.floor(Math.random() * 2)];

          let colorClass = '';
          if (num === 0) colorClass = 'bg-gradient-to-br from-violet-500 to-red-500';
          else if (num === 5) colorClass = 'bg-gradient-to-br from-violet-500 to-green-500';
          else if ([2, 4, 6, 8].includes(num)) colorClass = 'bg-red-500';
          else colorClass = 'bg-green-500';

          data = { ...data, num, bs: num >= 5 ? 'Big' : 'Small', color: colorClass };
        } else if (gameType === 'k3') {
          const dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
          const sum = dice.reduce((a, b) => a + b, 0);
          data = { ...data, dice, sum, oe: sum % 2 === 0 ? 'Even' : 'Odd', bs: sum >= 11 ? 'Big' : 'Small' };
        } else if (gameType === 'dt') {
          const r = Math.random() * 100;
          let dVal, tVal, winner: 'Dragon' | 'Tiger' | 'Tie';
          if (r < 4) { dVal = tVal = Math.floor(Math.random() * 13) + 1; winner = 'Tie'; }
          else if (r < 52) { dVal = Math.floor(Math.random() * 12) + 2; tVal = Math.floor(Math.random() * (dVal - 1)) + 1; winner = 'Dragon'; }
          else { tVal = Math.floor(Math.random() * 12) + 2; dVal = Math.floor(Math.random() * (tVal - 1)) + 1; winner = 'Tiger'; }
          data = { ...data, dragonCard: dVal, tigerCard: tVal, winner };
        }

        setDoc(resRef, data).catch((e) => {
          if (e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: resRef.path, operation: 'create', requestResourceData: data }));
          }
        });
      }
    }
  }, [firestore, user, getPeriodId]);

  const settleBets = useCallback(async () => {
    if (!firestore || !user || isSettling.current) return;
    isSettling.current = true;

    try {
      const now = new Date();
      const currentPeriodIdWingo = getPeriodId('wingo', now);
      const currentPeriodIdK3 = getPeriodId('k3', now);
      const currentPeriodIdDT = getPeriodId('dt', now);

      const txRef = collection(firestore, 'transactions');
      const q = query(
        txRef,
        where('userId', '==', user.uid),
        where('type', '==', 'game'),
        where('settled', '==', false),
        limit(15)
      );

      const querySnapshot = await getDocs(q);
      
      for (const txDoc of querySnapshot.docs) {
        const txData = txDoc.data();
        const metadata = txData.metadata || {};
        const period = metadata.period;
        const bet = metadata.bet;
        const gameType = metadata.gameType;
        const amount = Number(metadata.amount || 0);

        if (!period || !bet || !gameType || amount <= 0) {
          await updateDoc(doc(firestore, 'transactions', txDoc.id), { settled: true });
          continue;
        }

        // STRICT RULE: Only settle if the period has ended
        const currentRef = gameType === 'wingo' ? currentPeriodIdWingo : gameType === 'k3' ? currentPeriodIdK3 : currentPeriodIdDT;
        if (period >= currentRef) continue;

        let resultSnap = await getDoc(doc(firestore, `${gameType}_results`, period));

        if (resultSnap.exists()) {
          const resultData = resultSnap.data();
          let isWin = false;
          let multiplier = 0;

          if (gameType === 'wingo') {
            const betLower = bet.toLowerCase();
            const resNum = resultData.num;
            const resColor = resultData.color.toLowerCase();
            const resBS = resultData.bs.toLowerCase();

            if (betLower === 'big' || betLower === 'small') {
              isWin = resBS === betLower;
              multiplier = 2;
            } else if (['green', 'red', 'violet'].includes(betLower)) {
              if (betLower === 'violet') {
                isWin = resColor.includes('violet');
                multiplier = 4.5;
              } else if (betLower === 'green') {
                isWin = [1, 3, 7, 9, 5].includes(resNum);
                multiplier = resNum === 5 ? 1.5 : 2; // Strict Rule: Shared color gets 1.5x
              } else if (betLower === 'red') {
                isWin = [2, 4, 6, 8, 0].includes(resNum);
                multiplier = resNum === 0 ? 1.5 : 2;
              }
            } else if (betLower.startsWith('number_')) {
              const betNum = parseInt(betLower.split('_')[1]);
              isWin = resNum === betNum;
              multiplier = 9;
            }
          } else if (gameType === 'k3') {
            const betLower = bet.toLowerCase();
            if (['big', 'small'].includes(betLower)) {
              isWin = resultData.bs.toLowerCase() === betLower;
              multiplier = 2;
            } else if (['odd', 'even'].includes(betLower)) {
              isWin = resultData.oe.toLowerCase() === betLower;
              multiplier = 2;
            }
          } else if (gameType === 'dt') {
            const betLower = bet.toLowerCase();
            isWin = resultData.winner.toLowerCase() === betLower;
            multiplier = betLower === 'tie' ? 9 : 2;
          }

          if (isWin && multiplier > 0) {
            const winAmount = amount * multiplier;
            const userRef = doc(firestore, 'users', user.uid);
            
            await updateDoc(userRef, {
              'wallet.balance': increment(winAmount),
              updatedAt: serverTimestamp()
            });

            await addDoc(collection(firestore, 'transactions'), {
              userId: user.uid,
              amount: winAmount,
              currency: 'INR',
              type: 'game',
              description: `Win Payout: ${gameType.toUpperCase()} (P: ${period})`,
              settled: true,
              createdAt: serverTimestamp()
            });

            toast({
              title: 'WINNER! 🏆',
              description: `₹${winAmount.toFixed(2)} added to your wallet`,
              className: 'bg-green-600 text-white font-black'
            });
          }

          // Mark bet as settled regardless of outcome
          await updateDoc(doc(firestore, 'transactions', txDoc.id), {
            settled: true,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Settlement Error:', error);
    } finally {
      isSettling.current = false;
    }
  }, [firestore, user, toast, getPeriodId]);

  useEffect(() => {
    const interval = setInterval(() => {
      runResultGeneration();
      settleBets();
    }, 5000);
    return () => clearInterval(interval);
  }, [runResultGeneration, settleBets]);

  return null;
}
