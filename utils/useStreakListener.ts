// ─── useStreakListener.ts ────────────────────────────────────────────────────
// Real-time Firestore listener for streak data
// Uses onSnapshot for instant updates across devices

import { useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  Firestore,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { calculateStreak, StreakData } from './streakCalculator';

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

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setStreakData(null);
      return;
    }

    // Create reference to user's streak document
    const streakDocRef = doc(db, 'users', userId, 'streakData', 'current');

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      streakDocRef,
      (snapshot: DocumentSnapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.data() as StreakDocument;
            const lastActiveDate = data.lastActiveDate
              ? new Date(data.lastActiveDate.toMillis())
              : null;

            // Recalculate streak with latest data
            const calculated = calculateStreak(
              lastActiveDate,
              data.currentStreak,
              data.timezone || userTimezone
            );

            setStreakData(calculated);
            setError(null);
          } else {
            // Document doesn't exist yet
            setStreakData({
              currentStreak: 0,
              lastActiveDate: null,
              highestStreak: 0,
            });
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [userId, db, userTimezone]);

  return { streakData, loading, error };
}
