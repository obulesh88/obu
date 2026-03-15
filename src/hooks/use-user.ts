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
          const generateWalletAddress = () => {
            const chars = '0123456789abcdef';
            let addr = '0x';
            for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * chars.length)];
            return addr;
          };
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

          const newProfile: UserProfile = {
            uid: guestUid,
            email: authUser.email || '',
            phoneNumber: pendingPhone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            profile: { displayName: authUser.displayName || 'New Earner', Uid: guestUid },
            wallet: { orBalance: 0, inrBalance: 0, walletAddress: generateWalletAddress() },
            referral: { code: referralCode, count: 0, earnings: 0 },
            bankDetails: { name: '', contact: '', email: '', accountNumber: '', ifsc: '', vpa: '' },
            captcha: { is_active: false, verifiedAt: null, claimed: false, reward_comm: 0 },
            watchAds: { ad_provider: 'Monetag', ad_start: null, verifiedAt: null, ad_completed: false, reward_comm: 0 },
            status: { status: 'Active' },
          };

          setDoc(currentUserRef, newProfile)
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
              const referralReward = 750;
              
              const updateData = {
                'referral.count': increment(1),
                'referral.earnings': increment(referralReward),
                'wallet.orBalance': increment(referralReward),
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
                currency: 'OR',
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
