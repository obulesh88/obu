'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

/**
 * A client component that listens for Firestore permission errors
 * and surfaces them to the developer for easier debugging.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (e: FirestorePermissionError) => {
      setError(e);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      // This throw is caught by the Next.js dev overlay to show a rich error.
      throw error;
    } else {
      // In production, we don't want to crash the app.
      // We reset the error state to allow the app to continue.
      // The error is not logged to the console to avoid duplicate messages,
      // as the original error is already an uncaught promise rejection.
      setError(null);
    }
  }

  return null; // This component renders nothing.
}
