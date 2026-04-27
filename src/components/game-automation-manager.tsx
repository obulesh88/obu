'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  increment, 
  addDoc, 
  limit 
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Global component that simulates a backend server.
 * It strictly handles:
 * 1. Result Generation (Only for completed periods)
 * 2. Bet Settlement (Calculating winners and updating balances)
 * 3. Bankruptcy Protection (Clearing wages if balance hits zero)
 */
export function GameAutomationManager() {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const lastProcessedMinute = useRef<number | null>(null);
  const isSettling = useRef(false);

  // Helper to generate a Period ID (YYYMMDD TypeCode HHMM)
  const getPeriodId = useCallback((gameType: 'wingo' | 'k3' | 'dt', date: Date) => {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const typeCode = gameType === 'wingo' ? '1000' : gameType === 'k3' ? '3000' : '4000';
    return `${datePart}${typeCode}${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  /**
   * BANKRUPTCY PROTECTION
   * If the user's balance hits zero (loss whole amount), 
   * clear the wagering turnover automatically.
   */
  useEffect(() => {
    if (!firestore || !user || !userProfile) return;

    const balance = userProfile.wallet?.balance || 0;
    const wages = userProfile.wallet?.wageringRequired || 0;

    // If balance is practically zero and there are still wages to clear
    if (balance < 0.01 && wages > 0.01) {
      const userRef = doc(firestore, 'users', user.uid);
      const updateData = {
        'wallet.wageringRequired': 0,
        updatedAt: serverTimestamp()
      };

      updateDoc(userRef, updateData).catch((error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: updateData
          } satisfies SecurityRuleContext));
        }
      });
    }
  }, [userProfile?.wallet?.balance, userProfile?.wallet?.wageringRequired, firestore, user]);

  /**
   * Generates results for the minute that JUST ENDED.
   */
  const generatePastResults = useCallback(async () => {
    if (!firestore || !user) return;

    const now = new Date();
    const currentMinute = now.getMinutes();

    if (lastProcessedMinute.current === currentMinute) return;
    lastProcessedMinute.current = currentMinute;

    const pastMinuteDate = new Date(now.getTime() - 60000);
    const gameTypes: ('wingo' | 'k3' | 'dt')[] = ['wingo', 'k3', 'dt'];

    for (const gameType of gameTypes) {
      const periodId = getPeriodId(gameType, pastMinuteDate);
      const collectionName = gameType === 'dt' ? 'dragon_tiger_results' : (gameType === 'k3' ? 'k3_results' : 'wingo_results');
      const resultRef = doc(firestore, collectionName, periodId);
      
      let resultData: any = null;

      try {
        const snap = await getDoc(resultRef);
        if (!snap.exists()) {
          if (gameType === 'wingo') {
            const num = Math.floor(Math.random() * 10);
            let colorClass = '';
            if (num === 0) colorClass = 'bg-gradient-to-br from-violet-500 to-red-500';
            else if (num === 5) colorClass = 'bg-gradient-to-br from-violet-500 to-green-500';
            else if (num % 2 === 0) colorClass = 'bg-red-500';
            else colorClass = 'bg-green-500';

            resultData = { 
              period: periodId, 
              num, 
              bs: num >= 5 ? 'Big' : 'Small', 
              color: colorClass,
              createdAt: serverTimestamp() 
            };
          } else if (gameType === 'k3') {
            const dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
            const sum = dice.reduce((a, b) => a + b, 0);
            resultData = { 
              period: periodId, 
              dice, 
              sum, 
              oe: sum % 2 === 0 ? 'Even' : 'Odd', 
              bs: sum >= 11 ? 'Big' : 'Small',
              createdAt: serverTimestamp() 
            };
          } else if (gameType === 'dt') {
            const dragon = Math.floor(Math.random() * 13) + 1;
            const tiger = Math.floor(Math.random() * 13) + 1;
            const winner = dragon > tiger ? 'Dragon' : tiger > dragon ? 'Tiger' : 'Tie';
            resultData = { 
              period: periodId, 
              dragonCard: dragon, 
              tigerCard: tiger, 
              winner,
              createdAt: serverTimestamp() 
            };
          }

          if (resultData) {
            setDoc(resultRef, resultData)
              .catch(async (error: any) => {
                if (error.code === 'permission-denied') {
                  errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: resultRef.path,
                    operation: 'create',
                    requestResourceData: resultData
                  } satisfies SecurityRuleContext));
                }
              });
          }
        }
      } catch (err: any) {
        // Errors caught by catch chain above
      }
    }
  }, [firestore, user, getPeriodId]);

  /**
   * Scans for unsettled bets and processes payouts.
   */
  const processSettlements = useCallback(async () => {
    if (!firestore || !user || isSettling.current) return;
    isSettling.current = true;

    try {
      const txRef = collection(firestore, 'transactions');
      const unsettledQuery = query(
        txRef,
        where('userId', '==', user.uid),
        where('type', '==', 'game'),
        where('settled', '==', false),
        limit(10)
      );

      const querySnapshot = await getDocs(unsettledQuery);
      if (querySnapshot.empty) {
        isSettling.current = false;
        return;
      }

      const now = new Date();
      const currentPeriods = {
        wingo: getPeriodId('wingo', now),
        k3: getPeriodId('k3', now),
        dt: getPeriodId('dt', now)
      };

      for (const txDoc of querySnapshot.docs) {
        const txData = txDoc.data();
        const { period, bet, gameType, amount } = txData.metadata || {};

        if (!period || !gameType || !bet || !amount) {
          const settledRef = doc(firestore, 'transactions', txDoc.id);
          updateDoc(settledRef, { settled: true });
          continue;
        }

        // Only settle periods that have concluded
        if (period >= currentPeriods[gameType as keyof typeof currentPeriods]) continue;

        const collectionName = gameType === 'dt' ? 'dragon_tiger_results' : (gameType === 'k3' ? 'k3_results' : 'wingo_results');
        const resultSnap = await getDoc(doc(firestore, collectionName, period));
        
        if (resultSnap.exists()) {
          const res = resultSnap.data();
          let isWin = false;
          let multiplier = 0;

          if (gameType === 'wingo') {
            const b = bet.toLowerCase();
            if (b === 'big' || b === 'small') { 
              isWin = res.bs.toLowerCase() === b; 
              multiplier = 1.90; 
            } else if (b === 'green') { 
              isWin = [1, 3, 7, 9, 5].includes(res.num); 
              multiplier = res.num === 5 ? 1.45 : 1.90; 
            } else if (b === 'red') { 
              isWin = [2, 4, 6, 8, 0].includes(res.num); 
              multiplier = res.num === 0 ? 1.45 : 1.90; 
            } else if (b === 'violet') { 
              isWin = [0, 5].includes(res.num); 
              multiplier = 4.25; 
            } else if (b.startsWith('number_')) { 
              isWin = res.num === parseInt(b.split('_')[1]); 
              multiplier = 9; 
            }
          } else if (gameType === 'k3') {
            const b = bet.toLowerCase();
            if (['big', 'small'].includes(b)) { isWin = res.bs.toLowerCase() === b; multiplier = 1.90; }
            else if (['odd', 'even'].includes(b)) { isWin = res.oe.toLowerCase() === b; multiplier = 1.90; }
          } else if (gameType === 'dt') {
            const b = bet.toLowerCase();
            isWin = res.winner.toLowerCase() === b;
            multiplier = b === 'tie' ? 9 : 1.90;
          }

          if (isWin) {
            const winAmount = amount * multiplier;
            const userRef = doc(firestore, 'users', user.uid);
            
            updateDoc(userRef, { 'wallet.balance': increment(winAmount), updatedAt: serverTimestamp() })
              .catch(async (error: any) => {
                if (error.code === 'permission-denied') {
                  errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: { 'wallet.balance': increment(winAmount) }
                  } satisfies SecurityRuleContext));
                }
              });

            const winnerTxData = {
              userId: user.uid,
              amount: winAmount,
              currency: 'INR',
              type: 'game',
              description: `Winner Payout: ${gameType.toUpperCase()} (P:${period})`,
              settled: true,
              createdAt: serverTimestamp()
            };

            addDoc(collection(firestore, 'transactions'), winnerTxData)
              .catch(async (error: any) => {
                if (error.code === 'permission-denied') {
                  errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'transactions',
                    operation: 'create',
                    requestResourceData: winnerTxData
                  } satisfies SecurityRuleContext));
                }
              });

            toast({
              title: "WINNER! 🏆",
              description: `₹${winAmount.toFixed(2)} credited for ${gameType.toUpperCase()}`,
              className: "bg-green-600 text-white font-black"
            });
          }

          // Mark bet as settled
          const txUpdateData = { settled: true, updatedAt: serverTimestamp() };
          const betTxRef = doc(firestore, 'transactions', txDoc.id);
          
          updateDoc(betTxRef, txUpdateData)
            .catch(async (error: any) => {
              if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: betTxRef.path,
                  operation: 'update',
                  requestResourceData: txUpdateData
                } satisfies SecurityRuleContext));
              }
            });
        }
      }
    } catch (err) {
      // General loop error handling
    } finally {
      isSettling.current = false;
    }
  }, [firestore, user, toast, getPeriodId]);

  useEffect(() => {
    const loop = setInterval(() => {
      generatePastResults();
      processSettlements();
    }, 5000);
    return () => clearInterval(loop);
  }, [generatePastResults, processSettlements]);

  return null;
}