'use client';
import { useMemo } from 'react';
import { useFirebaseAuth } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore } from '@/firebase';
import { doc, type DocumentReference } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


export function useUser() {
  const { user: authUser, loading: authLoading } = useFirebaseAuth();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<UserProfile>;
  }, [firestore, authUser]);

  const { data: userProfile, loading: profileLoading } = useDoc(userDocRef);

  return {
    user: authUser,
    userProfile,
    loading: authLoading || profileLoading,
  };
}
