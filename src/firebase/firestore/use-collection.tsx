'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, Query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * A hook that listens to a Firestore collection or query and returns the data.
 * @param query The Firestore Query or CollectionReference to listen to.
 */
export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [snapshot, setSnapshot] = useState<QuerySnapshot<T> | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          ...(doc.data() as any),
          id: doc.id,
        })) as (T & { id: string })[];
        setData(docs as any);
        setSnapshot(snapshot);
        setLoading(false);
      },
      async (err) => {
        if (err.code === 'permission-denied') {
          // Attempt to extract the path from the query object if available
          const path = (query as any)._query?.path?.toString() || 'unknown collection path';
          const permissionError = new FirestorePermissionError({
            path,
            operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error, snapshot };
}
