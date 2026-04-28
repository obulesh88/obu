
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
 * 4. Referral Claim Processing (Referrer claiming their rewards)
 */
export function GameAutomationManager() {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const lastProcessedMinute = useRef<number | null>(null);
  const isSettling = useRef(false);
  const isProcessingReferrals = useRef(false);

  // Helper to generate a Period ID
  const getPeriodId = useCallback((gameType: 'wingo' | 'k3' | 'dt', date: Date) => {
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const typeCode = gameType === 'wingo' ? '1000' : gameType === 'k3' ? '3000' : '4000';
    return `${datePart}${typeCode}${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  /**
   * REFERRAL CLAIM PROCESSING
   * Scans for pending referrals tied to this user's code and credits them.
   */
  const processReferralClaims = useCallback(async () => {
    if (!firestore || !user || !userProfile?.referral?.code || isProcessingReferrals.current) return;
    isProcessingReferrals.current = true;

    try {
      const referralsRef = collection(firestore, 'referrals');
      const q = query(
        referralsRef,
        where('referrerCode', '==', userProfile.referral.code.toUpperCase()),
        where('status', '==', 'pending'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isProcessingReferrals.current = false;
        return;
      }

      const userRef = doc(firestore, 'users', user.uid);

      for (const referralDoc of querySnapshot.docs) {
        const data = referralDoc.data();
        const reward = data.amount || 45;

        // 1. Credit Referrer (Self)
        await updateDoc(userRef, {
          'wallet.balance': increment(reward),
          'referral.count': increment(1),
          'referral.earnings': increment(reward),
          updatedAt: serverTimestamp()
        });

        // 2. Log Transaction
        await addDoc(collection(firestore, 'transactions'), {
          userId: user.uid,
          amount: reward,
          currency: 'INR',
          type: 'referral',
          description: `Referral Reward: ${data.refereeName || 'Friend'} joined`,
          createdAt: serverTimestamp()
        });

        // 3. Mark Claim as Completed
        await updateDoc(doc(firestore, 'referrals', referralDoc.id), {
          status: 'completed',
          updatedAt: serverTimestamp()
        });

        toast({
          title: "Referral Bonus! 🎁",
          description: `₹${reward} credited to your wallet.`,
          className: "bg-purple-600 text-white font-black"
        });
      }
    } catch (err) {
      console.error('Referral processing error:', err);
    } finally {
      isProcessingReferrals.current = false;
    }
  }, [firestore, user, userProfile, toast]);

  /**
   * BANKRUPTCY PROTECTION
   */
  useEffect(() => {
    if (!firestore || !user || !userProfile) return;
    const balance = userProfile.wallet?.balance || 0;
    const wages = userProfile.wallet?.wageringRequired || 0;
    if (balance < 0.01 && wages > 0.01) {
      const userRef = doc(firestore, 'users', user.uid);
      updateDoc(userRef, { 'wallet.wageringRequired': 0, updatedAt: serverTimestamp() });
    }
  }, [userProfile?.wallet?.balance, userProfile?.wallet?.wageringRequired, firestore, user]);

  /**
   * Results Generation Loop
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
      const snap = await getDoc(resultRef);
      if (!snap.exists()) {
        let resultData: any = null;
        if (gameType === 'wingo') {
          const num = Math.floor(Math.random() * 10);
          resultData = { period: periodId, num, bs: num >= 5 ? 'Big' : 'Small', color: num % 2 === 0 ? 'bg-red-500' : 'bg-green-500', createdAt: serverTimestamp() };
        } else if (gameType === 'k3') {
          const dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
          const sum = dice.reduce((a, b) => a + b, 0);
          resultData = { period: periodId, dice, sum, oe: sum % 2 === 0 ? 'Even' : 'Odd', bs: sum >= 11 ? 'Big' : 'Small', createdAt: serverTimestamp() };
        } else if (gameType === 'dt') {
          const dragon = Math.floor(Math.random() * 13) + 1;
          const tiger = Math.floor(Math.random() * 13) + 1;
          resultData = { period: periodId, dragonCard: dragon, tigerCard: tiger, winner: dragon > tiger ? 'Dragon' : 'Tiger', createdAt: serverTimestamp() };
        }
        if (resultData) setDoc(resultRef, resultData);
      }
    }
  }, [firestore, user, getPeriodId]);

  /**
   * Bet Settlement Loop
   */
  const processSettlements = useCallback(async () => {
    if (!firestore || !user || isSettling.current) return;
    isSettling.current = true;
    try {
      const unsettledQuery = query(collection(firestore, 'transactions'), where('userId', '==', user.uid), where('type', '==', 'game'), where('settled', '==', false), limit(10));
      const querySnapshot = await getDocs(unsettledQuery);
      if (querySnapshot.empty) { isSettling.current = false; return; }
      
      const now = new Date();
      const currentPeriods = { wingo: getPeriodId('wingo', now), k3: getPeriodId('k3', now), dt: getPeriodId('dt', now) };

      for (const txDoc of querySnapshot.docs) {
        const txData = txDoc.data();
        const { period, bet, gameType, amount } = txData.metadata || {};
        if (!period || period >= currentPeriods[gameType as keyof typeof currentPeriods]) continue;

        const collectionName = gameType === 'dt' ? 'dragon_tiger_results' : (gameType === 'k3' ? 'k3_results' : 'wingo_results');
        const resultSnap = await getDoc(doc(firestore, collectionName, period));
        if (resultSnap.exists()) {
          const res = resultSnap.data();
          let isWin = false;
          if (gameType === 'wingo') isWin = (bet === 'big' && res.bs === 'Big') || (bet === 'small' && res.bs === 'Small');
          else if (gameType === 'k3') isWin = (bet === 'big' && res.bs === 'Big') || (bet === 'small' && res.bs === 'Small');
          else if (gameType === 'dt') isWin = res.winner.toLowerCase() === bet.toLowerCase();

          if (isWin) {
            const winAmount = amount * 1.9;
            updateDoc(doc(firestore, 'users', user.uid), { 'wallet.balance': increment(winAmount) });
            addDoc(collection(firestore, 'transactions'), { userId: user.uid, amount: winAmount, type: 'game', description: `Win: ${gameType.toUpperCase()}`, settled: true, createdAt: serverTimestamp() });
          }
          updateDoc(doc(firestore, 'transactions', txDoc.id), { settled: true });
        }
      }
    } finally { isSettling.current = false; }
  }, [firestore, user, getPeriodId]);

  useEffect(() => {
    const loop = setInterval(() => {
      generatePastResults();
      processSettlements();
      processReferralClaims();
    }, 5000);
    return () => clearInterval(loop);
  }, [generatePastResults, processSettlements, processReferralClaims]);

  return null;
}
