// ─── activityTracker.ts ──────────────────────────────────────────────────────
// Functions to track user activities in Firestore

import {
  db,
} from '@/services/firebase';
import {
  collection,
  serverTimestamp,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

export interface ActivityLog {
  userId: string;
  title: string;
  sessions: number;
  totalMinutes: number;
  timestamp: Timestamp;
  date: string; // ISO date string for querying (YYYY-MM-DD)
}

export interface ActivityStats {
  userId: string;
  currentStreak: number;
  lastActiveDate: Timestamp | null;
  highestStreak: number;
  totalActivities: number;
  timezone: string;
}

/**
 * Log a new activity and update streak
 *
 * WORKFLOW:
 * 1. Add activity to activities collection
 * 2. Update user's streak data
 * 3. Update user's activity stats
 */
export async function logActivity(
  userId: string,
  title: string,
  sessions: number,
  totalMinutes: number,
  timezone: string = 'UTC'
): Promise<void> {
  if (!userId || !title) {
    throw new Error('userId and title are required');
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // 1. Add activity log
    const activityRef = doc(
      collection(db, 'users', userId, 'activities'),
      `${todayDate}_${Date.now()}`
    );

    batch.set(activityRef, {
      userId,
      title,
      sessions,
      totalMinutes,
      timestamp: now,
      date: todayDate,
    });

    // 2. Update streak data (this triggers recalculation in listener)
    const streakRef = doc(db, 'users', userId, 'streakData', 'current');
    batch.set(
      streakRef,
      {
        userId,
        lastActiveDate: now,
        timezone,
        updatedAt: now,
      },
      { merge: true }
    );

    // 3. Update activity stats
    const statsRef = doc(db, 'users', userId, 'stats', 'overall');
    batch.set(
      statsRef,
      {
        userId,
        totalActivities: 1,
        lastUpdated: now,
      },
      { merge: true }
    );

    await batch.commit();
    console.log(`✅ Activity logged for ${userId}: ${title}`);
  } catch (error) {
    console.error('❌ Error logging activity:', error);
    throw error;
  }
}

/**
 * Initialize streak data for a new user
 */
export async function initializeStreakData(
  userId: string,
  timezone: string = 'UTC'
): Promise<void> {
  const streakRef = doc(db, 'users', userId, 'streakData', 'current');

  try {
    await setDoc(streakRef, {
      userId,
      currentStreak: 0,
      lastActiveDate: null,
      highestStreak: 0,
      timezone,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Streak data initialized for ${userId}`);
  } catch (error) {
    console.error('❌ Error initializing streak data:', error);
    throw error;
  }
}

/**
 * Get today's date in user's timezone
 */
export function getTodayISODate(timezone: string = 'UTC'): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}
