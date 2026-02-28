'use client';
import { useMemo, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, type DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function useUser() {
  const { user: authUser, loading: authLoading } = useFirebaseAuth();
  const firestore = useFirestore();
  const [isInitializing, setIsInitializing] = useState(false);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser]);

  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  // Auto-initialize profile for new guest users
  useEffect(() => {
    if (!authLoading && authUser && !profileLoading && !userProfile && firestore && !isInitializing) {
      setIsInitializing(true);
      const guestUid = authUser.uid;
      const userDocRef = doc(firestore, 'users', guestUid);
      
      const newProfile = {
        uid: guestUid,
        email: authUser.email,
        phoneNumber: 'Not provided',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profile: {
          displayName: 'Guest User',
          Uid: guestUid,
        },
        wallet: {
          orBalance: 0,
          inrBalance: 0,
          walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        },
        referral: {
          referralCode: guestUid.toUpperCase().substring(0, 8),
          referredBy: null,
          referralCount: 0,
          totalReferralEarnings: 0,
        },
        captcha: {
          is_active: false,
          verifiedAt: null,
          claimed: false,
          reward_comm: 0,
        },
        playGames: {
          is_active: false,
          min_required_seconds: 300,
          play_start: null,
          total_play_seconds: 0,
          verifiedAt: null,
          claimed: false,
          reward_comm: 0,
          game_id: null,
        },
        watchAds: {
          ad_provider: 'Monetag',
          ad_start: null,
          verifiedAt: null,
          ad_completed: false,
          reward_comm: 0,
        },
        status: {
          status: 'Active',
        },
      };

      setDoc(userDocRef, newProfile).finally(() => setIsInitializing(false));
    }
  }, [authLoading, authUser, profileLoading, userProfile, firestore, isInitializing]);

  return {
    user: authUser,
    userProfile,
    loading: authLoading || profileLoading || isInitializing,
  };
}
