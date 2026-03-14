'use client';

import { getApps, initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useFirebaseAuth } from './auth/use-user';
import { useDoc } from './firestore/use-doc';
import { useCollection } from './firestore/use-collection';

function initializeFirebase() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  const auth = getAuth(app);
  
  return { firebaseApp: app, auth, firestore };
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
