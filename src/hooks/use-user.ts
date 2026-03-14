'use client';
import { useMemo, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, type DocumentReference, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

/**
 * Hook to manage user authentication state and Firestore profile synchronization.
 * It automatically initializes a Firestore profile for newly authenticated users.
 */
export function useUser() {
  const { user: authUser, loading: authLoading } = useFirebaseAuth();
  const firestore = useFirestore();
  const [isInitializing, setIsInitializing] = useState(false);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser]);

  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  useEffect(() => {
    const initProfile = async () => {
      if (!authLoading && authUser && !profileLoading && !userProfile && firestore && !isInitializing) {
        setIsInitializing(true);
        try {
          const guestUid = authUser.uid;
          const userDocRef = doc(firestore, 'users', guestUid);
          
          // Double check existence to prevent race conditions
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setIsInitializing(false);
            return;
          }

          const newProfile = {
            uid: guestUid,
            email: authUser.email || '',
            phoneNumber: authUser.phoneNumber || 'Not provided',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            profile: {
              displayName: authUser.displayName || 'New Earner',
              Uid: guestUid,
            },
            wallet: {
              orBalance: 0,
              inrBalance: 0,
              walletAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            },
            referral: {
              code: Math.random().toString(36).substring(2, 8).toUpperCase(),
              count: 0,
              earnings: 0,
            },
            bankDetails: {
              name: '',
              contact: '',
              email: '',
              accountNumber: '',
              ifsc: '',
              vpa: '',
            },
            captcha: {
              is_active: false,
              verifiedAt: null,
              claimed: false,
              reward_comm: 0,
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

          await setDoc(userDocRef, newProfile);
        } catch (error) {
          console.error("Error initializing user profile:", error);
        } finally {
          setIsInitializing(false);
        }
      }
    };

    initProfile();
  }, [authLoading, authUser, profileLoading, userProfile, firestore, isInitializing]);

  return {
    user: authUser,
    userProfile,
    loading: authLoading || profileLoading || isInitializing,
  };
}
