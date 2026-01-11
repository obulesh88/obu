'use client';

import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, collection, Query, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useCollection<T>(path: string | null, type: 'collection' | 'collectionGroup' = 'collection') {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const query: Query<T> | null = useMemo(() => {
      if (!path) return null;
      if (type === 'collectionGroup') {
          return collectionGroup(firestore, path) as Query<T>;
      }
      return collection(firestore, path) as Query<T>;
  }, [firestore, path, type]);


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
        const result: T[] = [];
        snapshot.forEach((doc) => {
          result.push({ ...doc.data(), id: doc.id } as T);
        });
        setData(result);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
