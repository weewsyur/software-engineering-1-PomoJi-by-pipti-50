// ─── hooks/useFirestore.ts ────────────────────────────────────────────────────
// React hooks for real-time Firestore operations
// Handles subscription lifecycle automatically

import { useState, useEffect, useCallback, useRef } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import {
  listenToDocument,
  listenToCollection,
  listenToStreak,
  listenToUserActivities,
  FirestoreStreakData,
  Activity,
} from '../services/firebase/firestore';

// ─── GENERIC HOOKS ───────────────────────────────────────────────────────────

/**
 * Hook to listen to a single document in real-time
 * @param collectionName - Collection path
 * @param docId - Document ID
 * @returns Object with data, loading, error
 */
export const useDocument = <T = any>(
  collectionName: string,
  docId: string | null
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToDocument(
      collectionName,
      docId,
      (fetchedData, err) => {
        if (err) {
          setError(err);
        } else {
          setData(fetchedData as T);
          setError(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
};

/**
 * Hook to listen to a collection in real-time
 * @param collectionName - Collection path
 * @param queryFn - Optional query function
 * @returns Object with data, loading, error
 */
export const useCollection = <T = any>(
  collectionName: string,
  queryFn?: (ref: any) => any
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToCollection(
      collectionName,
      (fetchedData, err) => {
        if (err) {
          setError(err);
        } else {
          setData(fetchedData as T[]);
          setError(null);
        }
        setLoading(false);
      },
      queryFn
    );

    return () => unsubscribe();
  }, [collectionName, queryFn]);

  return { data, loading, error };
};

// ─── SPECIFIC HOOKS ─────────────────────────────────────────────────────────

/**
 * Hook to listen to user's streak data in real-time
 * @param userId - User ID
 * @returns Object with streakData, loading, error
 */
export const useStreak = (userId: string | null) => {
  const [streakData, setStreakData] = useState<FirestoreStreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToStreak(userId, (data, err) => {
      if (err) {
        setError(err);
      } else {
        setStreakData(data);
        setError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { streakData, loading, error };
};

/**
 * Hook to listen to user's activities in real-time
 * @param userId - User ID
 * @param limitCount - Optional limit on number of activities
 * @returns Object with activities, loading, error
 */
export const useUserActivities = (userId: string | null, limitCount: number = 50) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToUserActivities(
      userId,
      (data, err) => {
        if (err) {
          setError(err);
        } else {
          setActivities(data);
          setError(null);
        }
        setLoading(false);
      },
      limitCount
    );

    return () => unsubscribe();
  }, [userId, limitCount]);

  return { activities, loading, error };
};

/**
 * Hook to manually trigger a Firestore operation with loading state
 * @returns Object with execute, loading, error
 */
export const useFirestoreOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (operation: () => Promise<any>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation();
        if (isMounted.current) {
          setLoading(false);
        }
        return result;
      } catch (err) {
        if (isMounted.current) {
          setError(err as Error);
          setLoading(false);
        }
        throw err;
      }
    },
    []
  );

  return { execute, loading, error };
};
