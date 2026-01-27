'use client';

import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, collection, Query, collectionGroup, DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useCollection<T>(pathOrQuery: string | Query<DocumentData> | null, type: 'collection' | 'collectionGroup' = 'collection') {
  const firestore = useFirestore();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const query: Query<T> | null = useMemo(() => {
      if (!pathOrQuery) return null;
      if (typeof pathOrQuery === 'string') {
        if (type === 'collectionGroup') {
            return collectionGroup(firestore, pathOrQuery) as Query<T>;
        }
        return collection(firestore, pathOrQuery) as Query<T>;
      }
      // It's a query
      return pathOrQuery as Query<T>;
  }, [firestore, pathOrQuery, type]);


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
          const docData = doc.data();
          // Ensure createdAt is handled correctly
          const finalData = { 
            ...docData, 
            id: doc.id,
            // Firestore timestamps need to be checked for existence before using toDate()
            createdAt: docData.createdAt && typeof docData.createdAt.toDate === 'function' 
              ? docData.createdAt 
              : docData.createdAt
          };
          result.push(finalData as T);
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
