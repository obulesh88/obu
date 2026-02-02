'use client';

import { getApps, initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useFirebaseAuth } from './auth/use-user';
import { useDoc } from './firestore/use-doc';

function initializeFirebase() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  
  return { firebaseApp: app, auth, firestore };
}

// The main useUser hook is in @/hooks/use-user.ts
// This re-export is kept for compatibility if it's used elsewhere,
// but direct usage should be from the primary hook file.
function useUser() {
    return useFirebaseAuth();
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useUser,
  useFirebaseAuth,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useDoc
};
