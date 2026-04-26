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
  increment,
  addDoc
} from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Hook to manage user authentication state and Firestore profile synchronization.
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

          const pendingPhone = localStorage.getItem('pending_phone_number') || 'Not provided';
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const memberId = 'OR-' + Math.floor(100000 + Math.random() * 900000);
          const SIGNUP_BONUS = 28;

          const newProfile: UserProfile = {
            uid: guestUid,
            memberId: memberId,
            email: authUser.email || '',
            phoneNumber: pendingPhone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            profile: { displayName: authUser.displayName || 'New Earner', Uid: guestUid },
            wallet: { balance: SIGNUP_BONUS },
            referral: { code: referralCode, count: 0, earnings: 0 },
            bankDetails: { name: '', contact: '', email: '', accountNumber: '', ifsc: '', vpa: '' },
            watchAds: { ad_provider: 'Monetag', ad_start: null, verifiedAt: null, ad_completed: false, reward_comm: 0 },
            status: { status: 'Active' },
          };

          setDoc(currentUserRef, newProfile)
            .then(() => {
              // Log the Sign-up Bonus Transaction
              const transactionsRef = collection(firestore, 'transactions');
              addDoc(transactionsRef, {
                userId: guestUid,
                amount: SIGNUP_BONUS,
                currency: 'INR',
                type: 'referral', // Using referral type for rewards
                description: 'Sign-up Bonus',
                createdAt: serverTimestamp()
              });
            })
            .catch(async (error) => {
              if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: currentUserRef.path,
                  operation: 'create',
                  requestResourceData: newProfile
                } satisfies SecurityRuleContext));
              }
            });

          localStorage.removeItem('pending_phone_number');

          const pendingReferralCode = localStorage.getItem('or_wallet_referral_code');
          if (pendingReferralCode && !referralProcessed.current) {
            referralProcessed.current = true;
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('referral.code', '==', pendingReferralCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const referrerDoc = querySnapshot.docs[0];
              const referrerRef = doc(firestore, 'users', referrerDoc.id);
              const referralReward = 45; // ₹45 reward per referral
              
              const updateData = {
                'referral.count': increment(1),
                'referral.earnings': increment(referralReward),
                'wallet.balance': increment(referralReward),
                'updatedAt': serverTimestamp()
              };

              updateDoc(referrerRef, updateData)
                .catch(async (error) => {
                  if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                      path: referrerRef.path,
                      operation: 'update',
                      requestResourceData: updateData
                    } satisfies SecurityRuleContext));
                  }
                });

              const transactionsRef = collection(firestore, 'transactions');
              const txData = {
                userId: referrerDoc.id,
                amount: referralReward,
                currency: 'INR',
                type: 'referral',
                description: `Referral Reward: ${newProfile.profile.displayName} joined`,
                createdAt: serverTimestamp()
              };

              addDoc(transactionsRef, txData)
                .catch(async (error) => {
                  if (error.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                      path: transactionsRef.path,
                      operation: 'create',
                      requestResourceData: txData
                    } satisfies SecurityRuleContext));
                  }
                });
            }
            localStorage.removeItem('or_wallet_referral_code');
          }
        } catch (error) {
          // General initialization failures
        } finally {
          setIsInitializing(false);
        }
      }
    };
    initProfile();
  }, [authLoading, authUser, profileLoading, userProfile, firestore, isInitializing]);

  return { user: authUser, userProfile, loading: authLoading || profileLoading || isInitializing };
}
