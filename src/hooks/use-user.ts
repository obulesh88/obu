'use client';
import { useMemo, useEffect, useState, useRef } from 'react';
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
 * and handles referral logic instantly and directly.
 */
export function useUser() {
  const { user: authUser, loading: authLoading } = useFirebaseAuth();
  const firestore = useFirestore();
  const [isInitializing, setIsInitializing] = useState(false);
  const referralProcessed = useRef(false);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser]);

  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  useEffect(() => {
    const initProfile = async () => {
      // Check if we have an auth user but no firestore profile yet
      if (!authLoading && authUser && !profileLoading && !userProfile && firestore && !isInitializing) {
        setIsInitializing(true);
        try {
          const guestUid = authUser.uid;
          const currentUserRef = doc(firestore, 'users', guestUid);
          
          const docSnap = await getDoc(currentUserRef);
          if (docSnap.exists()) {
            setIsInitializing(false);
            return;
          }

          // Retrieve pending phone number if exists
          const pendingPhone = localStorage.getItem('pending_phone_number') || 'Not provided';

          // Generate Unique Wallet Address (42-char hex string)
          const generateWalletAddress = () => {
            const chars = '0123456789abcdef';
            let addr = '0x';
            for (let i = 0; i < 40; i++) {
              addr += chars[Math.floor(Math.random() * chars.length)];
            }
            return addr;
          };

          // Generate Unique Referral Code (6-char alphanumeric)
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

          const newProfile: UserProfile = {
            uid: guestUid,
            email: authUser.email || '',
            phoneNumber: pendingPhone,
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

          // 1. Create the new user profile
          await setDoc(currentUserRef, newProfile);
          
          // Cleanup phone number from localStorage
          localStorage.removeItem('pending_phone_number');

          // 2. Immediately handle Referral Logic if a code exists in localStorage
          const pendingReferralCode = localStorage.getItem('or_wallet_referral_code');
          if (pendingReferralCode && !referralProcessed.current) {
            referralProcessed.current = true;
            
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('referral.code', '==', pendingReferralCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const referrerDoc = querySnapshot.docs[0];
              const referrerRef = doc(firestore, 'users', referrerDoc.id);
              
              // Update referrer directly and instantly with increment
              // Updated referral earnings to 1500 OR coins as requested
              await updateDoc(referrerRef, {
                'referral.count': increment(1),
                'referral.earnings': increment(1500),
                'wallet.orBalance': increment(1500),
                'updatedAt': serverTimestamp()
              });
              console.log(`Referral credited to ${referrerDoc.id} via code ${pendingReferralCode}`);
            }
            localStorage.removeItem('or_wallet_referral_code');
          }

        } catch (error) {
          console.error("Critical error during user/referral initialization:", error);
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
