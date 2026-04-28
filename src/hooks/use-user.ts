
'use client';
import { useMemo, useEffect, useState, useRef } from 'react';
import { useFirebaseAuth } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { 
  doc, 
  serverTimestamp, 
  type DocumentReference, 
  getDoc, 
  collection, 
  addDoc,
  writeBatch
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Core hook for managing user state and profile initialization.
 * Handles:
 * 1. Real-time profile fetching
 * 2. New user profile creation (Signup Bonus: ₹28)
 * 3. Referral processing (Referee registers a claim document)
 */
export function useUser() {
  const { user: authUser, loading: authLoading } = useFirebaseAuth();
  const firestore = useFirestore();
  const [isInitializing, setIsInitializing] = useState(false);
  const referralProcessed = useRef(false);

  // Memoize the document reference to prevent unnecessary hook re-runs
  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser]);

  // Listen to the user document in real-time
  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  useEffect(() => {
    const initProfile = async () => {
      // Only proceed if auth is loaded, user is logged in, but profile doesn't exist yet
      if (!authLoading && authUser && !profileLoading && !userProfile && firestore && !isInitializing) {
        setIsInitializing(true);
        try {
          const guestUid = authUser.uid;
          const currentUserRef = doc(firestore, 'users', guestUid);
          
          // Re-verify document existence to handle race conditions
          const docSnap = await getDoc(currentUserRef);
          if (docSnap.exists()) {
            setIsInitializing(false);
            return;
          }

          // Generate unique identifiers
          const pendingPhone = typeof window !== 'undefined' ? localStorage.getItem('pending_phone_number') || 'Not provided' : 'Not provided';
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const memberId = 'OR-' + Math.floor(100000 + Math.random() * 900000);
          
          // PLATFORM BONUSES
          const SIGNUP_BONUS = 28;

          const newProfile: UserProfile = {
            uid: guestUid,
            memberId: memberId,
            email: authUser.email || '',
            phoneNumber: pendingPhone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            profile: { 
              displayName: authUser.displayName || 'New Earner', 
              Uid: guestUid 
            },
            wallet: { 
              balance: SIGNUP_BONUS, 
              wageringRequired: 0 
            },
            referral: { 
              code: referralCode, 
              count: 0, 
              earnings: 0 
            },
            bankDetails: { 
              name: '', 
              contact: '', 
              email: '', 
              accountNumber: '', 
              ifsc: '', 
              vpa: '' 
            },
            watchAds: { 
              ad_provider: 'Monetag', 
              ad_start: null, 
              verifiedAt: null, 
              ad_completed: false, 
              reward_comm: 0 
            },
            status: { 
              status: 'Active' 
            },
          };

          // Use a batch for atomic creation
          const batch = writeBatch(firestore);
          batch.set(currentUserRef, newProfile);

          const transactionsRef = doc(collection(firestore, 'transactions'));
          batch.set(transactionsRef, {
            userId: guestUid,
            amount: SIGNUP_BONUS,
            currency: 'INR',
            type: 'referral',
            description: 'Welcome Signup Bonus',
            createdAt: serverTimestamp()
          });

          await batch.commit().catch(async (error) => {
            if (error.code === 'permission-denied') {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: currentUserRef.path,
                operation: 'create',
                requestResourceData: newProfile
              } satisfies SecurityRuleContext));
            }
          });

          // Cleanup pending metadata
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_phone_number');
          }

          // REFERRAL CLAIM SYSTEM
          // Referee creates a record in '/referrals' which the Referrer will claim upon login.
          const pendingReferralCode = typeof window !== 'undefined' ? localStorage.getItem('or_wallet_referral_code') : null;
          if (pendingReferralCode && !referralProcessed.current) {
            referralProcessed.current = true;
            
            const referralRecord = {
              referrerCode: pendingReferralCode.toUpperCase(),
              refereeUid: guestUid,
              refereeName: newProfile.profile.displayName,
              amount: 45,
              status: 'pending',
              createdAt: serverTimestamp()
            };

            addDoc(collection(firestore, 'referrals'), referralRecord)
              .catch(async (error) => {
                if (error.code === 'permission-denied') {
                  errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'referrals',
                    operation: 'create',
                    requestResourceData: referralRecord
                  } satisfies SecurityRuleContext));
                }
              });
            
            // Clear code after processing
            if (typeof window !== 'undefined') {
              localStorage.removeItem('or_wallet_referral_code');
            }
          }
        } catch (error) {
          console.error('Profile initialization failed:', error);
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
    loading: authLoading || profileLoading || isInitializing 
  };
}
