// ─── useStreakListener.ts ────────────────────────────────────────────────────
// Real-time Firestore listener for streak data
// Uses onSnapshot for instant updates across devices

import { useEffect, useRef, useState } from 'react';
import {
  doc,
  onSnapshot,
  Firestore,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { StreakData, getDisplayStreak } from './streakCalculator';

export interface StreakDocument {
  userId: string;
  currentStreak: number;
  lastActiveDate: Timestamp | null;
  highestStreak: number;
  timezone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UseStreakListenerReturn {
  streakData: StreakData | null;
  loading: boolean;
  error: Error | null;
}

/**
 * React Hook for real-time streak listening
 *
 * USAGE:
 * ```tsx
 * const { streakData, loading, error } = useStreakListener(db, userId);
 * ```
 *
 * BENEFITS:
 * - Automatic updates via Firestore onSnapshot
 * - Proper cleanup on unmount
 * - Error handling
 * - Loading states
 */
export function useStreakListener(
  db: Firestore,
  userId: string | null | undefined,
  userTimezone: string = 'UTC'
): UseStreakListenerReturn {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setStreakData(null);
      setError(null);
      return;
    }

    const isPermissionError = (err: unknown) => {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      const message = err instanceof Error ? err.message : String(err ?? '');
      return code === 'permission-denied' || message.toLowerCase().includes('permission');
    };

    const streakDocRef = doc(db, 'streaks', userId);
    let cancelled = false;

    const unsubscribe = onSnapshot(
      streakDocRef,
      (snapshot: DocumentSnapshot) => {
        if (cancelled) return;

        try {
          if (snapshot.exists()) {
            const data = snapshot.data() as StreakDocument;
            const lastActiveDate = data.lastActiveDate
              ? new Date(data.lastActiveDate.toMillis())
              : null;

            const currentStreak = getDisplayStreak(
              data.currentStreak || 0,
              lastActiveDate,
              data.timezone || userTimezone
            );

            setStreakData({
              currentStreak,
              lastActiveDate,
              highestStreak: data.highestStreak || 0,
            });
            setError(null);
          } else {
            setStreakData(null);
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        if (cancelled) return;

        if (isPermissionError(err)) {
          setError(err instanceof Error ? err : new Error('Permission denied'));
          setLoading(false);

          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }

          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount((count) => count + 1);
          }, 750);
          return;
        }

        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [userId, db, userTimezone, retryCount]);

  return { streakData, loading, error };
}
