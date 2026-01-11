'use client';

import { useMemo } from 'react';
import { FirebaseProvider, initializeFirebase } from '.';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { app, auth, firestore } = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider app={app} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
