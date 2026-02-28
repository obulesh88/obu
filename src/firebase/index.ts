'use client';

import { getApps, initializeApp, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';
import { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useFirebaseAuth } from './auth/use-user';
import { useDoc } from './firestore/use-doc';
import { useCollection } from './firestore/use-collection';

function initializeFirebase() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  
  // Auth is intentionally omitted to support the "no-auth" guest experience
  return { firebaseApp: app, auth: null, firestore };
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebaseAuth as useUser,
  useFirebaseAuth,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useDoc,
  useCollection
};
