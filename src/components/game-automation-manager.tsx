'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, updateDoc, increment, addDoc, limit } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Global component that handles automatic generation of game results
 * and settling of user bets.
 */
export function GameAutomationManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const lastProcessedMinute = useRef<number | null>(null);
  const isSettling = useRef(false);

  const generatePeriodId = useCallback((gameType: 'wingo' | 'k3' | 'dt') => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const typeCode = gameType === 'wingo' ? '1000' : gameType === 'k3' ? '3000' : '4000';
    return `${datePart}${typeCode}${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const runResultGeneration = useCallback(async () => {
    if (!firestore || !user) return;

    const now = new Date();
    const currentMinute = now.getMinutes();

    if (lastProcessedMinute.current === currentMinute) return;
    lastProcessedMinute.current = currentMinute;

    // 1. WinGo Result
    const wingoId = generatePeriodId('wingo');
    const wingoRef = doc(firestore, 'wingo_results', wingoId);
    const wingoSnap = await getDoc(wingoRef);
    if (!wingoSnap.exists()) {
      const r = Math.random() * 100;
      let num: number;
      if (r < 45) num = [1, 3, 7, 9][Math.floor(Math.random() * 4)];
      else if (r < 90) num = [2, 4, 6, 8][Math.floor(Math.random() * 4)];
      else num = [0, 5][Math.floor(Math.random() * 2)];

      // WinGo standard: 0 is Red+Violet, 5 is Green+Violet
      let colorClass = '';
      if (num === 0) colorClass = 'bg-gradient-to-br from-violet-500 to-red-500';
      else if (num === 5) colorClass = 'bg-gradient-to-br from-violet-500 to-green-500';
      else if ([2, 4, 6, 8].includes(num)) colorClass = 'bg-red-500';
      else colorClass = 'bg-green-500';

      const data = {
        period: wingoId,
        num: num,
        bs: num >= 5 ? 'Big' : 'Small',
        color: colorClass,
        createdAt: serverTimestamp()
      };
      setDoc(wingoRef, data).catch((e) => {
        if (e.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: wingoRef.path, operation: 'create', requestResourceData: data }));
        }
      });
    }

    // 2. K3 Result
    const k3Id = generatePeriodId('k3');
    const k3Ref = doc(firestore, 'k3_results', k3Id);
    const k3Snap = await getDoc(k3Ref);
    if (!k3Snap.exists()) {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const sum = d1 + d2 + d3;
      const data = {
        period: k3Id,
        dice: [d1, d2, d3],
        sum: sum,
        oe: sum % 2 === 0 ? 'Even' : 'Odd',
        bs: sum >= 11 ? 'Big' : 'Small',
        createdAt: serverTimestamp()
      };
      setDoc(k3Ref, data).catch((e) => {
        if (e.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: k3Ref.path, operation: 'create', requestResourceData: data }));
        }
      });
    }

    // 3. Dragon Tiger Result
    const dtId = generatePeriodId('dt');
    const dtRef = doc(firestore, 'dragon_tiger_results', dtId);
    const dtSnap = await getDoc(dtRef);
    if (!dtSnap.exists()) {
      const r = Math.random() * 100;
      let dVal, tVal, winner: 'Dragon' | 'Tiger' | 'Tie';
      if (r < 4) { dVal = tVal = Math.floor(Math.random() * 13) + 1; winner = 'Tie'; }
      else if (r < 52) { dVal = Math.floor(Math.random() * 12) + 2; tVal = Math.floor(Math.random() * (dVal - 1)) + 1; winner = 'Dragon'; }
      else { tVal = Math.floor(Math.random() * 12) + 2; dVal = Math.floor(Math.random() * (tVal - 1)) + 1; winner = 'Tiger'; }
      
      const data = { period: dtId, dragonCard: dVal, tigerCard: tVal, winner: winner, createdAt: serverTimestamp() };
      setDoc(dtRef, data).catch((e) => {
        if (e.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: dtRef.path, operation: 'create', requestResourceData: data }));
        }
      });
    }
  }, [firestore, user, generatePeriodId]);

  const settleBets = useCallback(async () => {
    if (!firestore || !user || isSettling.current) return;
    isSettling.current = true;

    try {
      const txRef = collection(firestore, 'transactions');
      const q = query(
        txRef,
        where('userId', '==', user.uid),
        where('type', '==', 'game'),
        where('settled', '==', false),
        limit(20)
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

        let resultSnap;
        if (gameType === 'wingo') resultSnap = await getDoc(doc(firestore, 'wingo_results', period));
        else if (gameType === 'k3') resultSnap = await getDoc(doc(firestore, 'k3_results', period));
        else if (gameType === 'dt') resultSnap = await getDoc(doc(firestore, 'dragon_tiger_results', period));

        if (resultSnap?.exists()) {
          const resultData = resultSnap.data();
          let isWin = false;
          let multiplier = 0;

          if (gameType === 'wingo') {
            const betLower = bet.toLowerCase();
            if (betLower === 'big' || betLower === 'small') {
              isWin = resultData.bs.toLowerCase() === betLower;
              multiplier = 2;
            } else if (['green', 'red', 'violet'].includes(betLower)) {
              const resColor = resultData.color.toLowerCase();
              if (betLower === 'violet') {
                isWin = resColor.includes('violet');
                multiplier = 4.5;
              } else {
                isWin = resColor.includes(betLower);
                multiplier = 2;
              }
            } else if (betLower.startsWith('number_')) {
              const betNum = parseInt(betLower.split('_')[1]);
              isWin = resultData.num === betNum;
              multiplier = 9;
            }
          } else if (gameType === 'k3') {
            const betLower = bet.toLowerCase();
            if (betLower === 'big' || betLower === 'small') {
              isWin = resultData.bs.toLowerCase() === betLower;
              multiplier = 2;
            } else if (betLower === 'odd' || betLower === 'even') {
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
            
            // Atomically update balance and mark settlement
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
              description: `₹${winAmount.toFixed(2)} added for ${gameType.toUpperCase()}`,
              className: 'bg-green-600 text-white font-black'
            });
          }

          // Mark as settled even if they lost
          await updateDoc(doc(firestore, 'transactions', txDoc.id), {
            settled: true,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Settlement process error:', error);
    } finally {
      isSettling.current = false;
    }
  }, [firestore, user, toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      runResultGeneration();
      settleBets();
    }, 5000);
    return () => clearInterval(interval);
  }, [runResultGeneration, settleBets]);

  return null;
}
