'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Global component that handles automatic generation of game results.
 * It runs in the background as long as the app is open and a user is authenticated.
 */
export function GameAutomationManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const lastProcessedMinute = useRef<number | null>(null);

  const generatePeriodId = useCallback((gameType: 'wingo' | 'k3' | 'dt') => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const typeCode = gameType === 'wingo' ? '1000' : gameType === 'k3' ? '3000' : '4000';
    return `${datePart}${typeCode}${totalMinutes.toString().padStart(4, '0')}`;
  }, []);

  const runAutomation = useCallback(async () => {
    if (!firestore || !user) return;

    const now = new Date();
    const currentMinute = now.getMinutes();

    // Only run once per minute
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

      const data = {
        period: wingoId,
        num: num,
        bs: num >= 5 ? 'Big' : 'Small',
        color: (num === 0 || num === 5) ? 'bg-gradient-to-br from-violet-500 to-red-500' : ([2, 4, 6, 8].includes(num) ? 'bg-red-500' : 'bg-green-500'),
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

  useEffect(() => {
    // Run every 2 seconds to catch the minute mark quickly
    const interval = setInterval(runAutomation, 2000);
    return () => clearInterval(interval);
  }, [runAutomation]);

  return null;
}
