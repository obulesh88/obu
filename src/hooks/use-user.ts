
'use client';
import { useMemo, useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  type DocumentReference, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

/**
 * Hook to manage user authentication state and Firestore profile synchronization.
 * It automatically initializes a Firestore profile for newly authenticated users
 * and handles referral logic instantly.
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
          
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setIsInitializing(false);
            return;
          }

          // Generate Unique Wallet Address
          const generateWalletAddress = () => {
            const chars = '0123456789abcdef';
            let addr = '0x';
            for (let i = 0; i < 40; i++) {
              addr += chars[Math.floor(Math.random() * chars.length)];
            }
            return addr;
          };

          // Generate Referral Code
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

          const newProfile: UserProfile = {
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
              walletAddress: generateWalletAddress(),
            },
            referral: {
              code: referralCode,
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

          // Instant Referral Logic
          const pendingReferralCode = localStorage.getItem('or_wallet_referral_code');
          if (pendingReferralCode) {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('referral.code', '==', pendingReferralCode));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const referrerDoc = querySnapshot.docs[0];
              const referrerRef = doc(firestore, 'users', referrerDoc.id);
              
              // Update referrer instantly: +1 count, +100 OR coins
              await updateDoc(referrerRef, {
                'referral.count': increment(1),
                'referral.earnings': increment(100),
                'wallet.orBalance': increment(100),
                'updatedAt': serverTimestamp()
              });
              
              console.log(`Referral reward given to user: ${referrerDoc.id}`);
            }
            localStorage.removeItem('or_wallet_referral_code');
          }

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
